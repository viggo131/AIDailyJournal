use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_sql::{Migration, MigrationKind};
use base64::{engine::general_purpose::STANDARD, Engine as _};

const SERVICE: &str = "The Daily Ledger";
const ACCOUNT: &str = "OpenAI API Key";

/// In-memory cache shared by both keychain and file-based storage.
/// Populated on first read, cleared on delete. Prevents repeated prompts.
pub struct CachedKey(pub Mutex<Option<String>>);

// ─── Keychain commands ────────────────────────────────────────────────────────

#[tauri::command]
fn set_api_key(key: String, state: State<'_, CachedKey>) -> Result<(), String> {
    keychain::delete(SERVICE, ACCOUNT).ok();
    keychain::set(SERVICE, ACCOUNT, &key)?;
    *state.0.lock().unwrap() = Some(key);
    Ok(())
}

#[tauri::command]
fn get_api_key(state: State<'_, CachedKey>) -> Result<String, String> {
    // Hold the lock for the entire read to prevent concurrent keychain prompts.
    // If two calls arrive simultaneously, the second waits and then finds the cache.
    let mut guard = state.0.lock().unwrap();
    if let Some(ref k) = *guard {
        return Ok(k.clone());
    }
    let k = keychain::get(SERVICE, ACCOUNT)?;
    *guard = Some(k.clone());
    Ok(k)
}

#[tauri::command]
fn delete_api_key(state: State<'_, CachedKey>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    keychain::delete(SERVICE, ACCOUNT)
}

// ─── File-based key commands (no keychain, base64-encoded) ───────────────────

fn key_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d: std::path::PathBuf| d.join(".apikey"))
        .map_err(|e: tauri::Error| e.to_string())
}

#[tauri::command]
fn set_key_local(key: String, state: State<'_, CachedKey>, app: tauri::AppHandle) -> Result<(), String> {
    let encoded = STANDARD.encode(key.as_bytes());
    let path = key_file_path(&app)?;
    std::fs::write(&path, encoded).map_err(|e| e.to_string())?;
    *state.0.lock().unwrap() = Some(key);
    Ok(())
}

#[tauri::command]
fn get_key_local(state: State<'_, CachedKey>, app: tauri::AppHandle) -> Result<String, String> {
    let mut guard = state.0.lock().unwrap();
    if let Some(ref k) = *guard {
        return Ok(k.clone());
    }
    let path = key_file_path(&app)?;
    let encoded = std::fs::read_to_string(&path).map_err(|_| "not found".to_string())?;
    let bytes = STANDARD.decode(encoded.trim()).map_err(|e| e.to_string())?;
    let key = String::from_utf8(bytes).map_err(|e| e.to_string())?;
    *guard = Some(key.clone());
    Ok(key)
}

#[tauri::command]
fn delete_key_local(state: State<'_, CachedKey>, app: tauri::AppHandle) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    let path = key_file_path(&app)?;
    std::fs::remove_file(&path).ok();
    Ok(())
}

// ─── Keychain module ──────────────────────────────────────────────────────────

/// macOS Keychain via SecItem API with Touch ID / passcode access control.
/// Items are stored with kSecAccessControlUserPresence so macOS prompts
/// Touch ID (or passcode fallback) exactly once per session.
mod keychain {
    use std::{ffi::CString, ptr};

    use core_foundation_sys::{
        base::{kCFAllocatorDefault, CFRelease, CFTypeRef, OSStatus},
        data::{CFDataCreate, CFDataGetBytePtr, CFDataGetLength, CFDataRef},
        dictionary::{
            kCFTypeDictionaryKeyCallBacks, kCFTypeDictionaryValueCallBacks,
            CFDictionaryAddValue, CFDictionaryCreateMutable, CFMutableDictionaryRef,
        },
        number::kCFBooleanTrue,
        string::{CFStringCreateWithCString, CFStringRef, kCFStringEncodingUTF8},
    };
    use security_framework_sys::base::{errSecItemNotFound, errSecSuccess};

    #[allow(dead_code)]
    #[link(name = "Security", kind = "framework")]
    extern "C" {
        static kSecClass: CFTypeRef;
        static kSecClassGenericPassword: CFTypeRef;
        static kSecAttrService: CFTypeRef;
        static kSecAttrAccount: CFTypeRef;
        static kSecAttrAccessControl: CFTypeRef;
        static kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly: CFTypeRef;
        static kSecAttrLabel: CFTypeRef;
        static kSecValueData: CFTypeRef;
        static kSecReturnData: CFTypeRef;
        static kSecMatchLimit: CFTypeRef;
        static kSecMatchLimitOne: CFTypeRef;

        fn SecItemAdd(attrs: CFTypeRef, result: *mut CFTypeRef) -> OSStatus;
        fn SecItemCopyMatching(query: CFTypeRef, result: *mut CFTypeRef) -> OSStatus;
        fn SecItemDelete(query: CFTypeRef) -> OSStatus;

        fn SecAccessControlCreateWithFlags(
            allocator: CFTypeRef,
            protection: CFTypeRef,
            flags: u64,
            error: *mut CFTypeRef,
        ) -> CFTypeRef;
    }

    // kSecAccessControlUserPresence = 1: Touch ID, Face ID, or passcode fallback
    const USER_PRESENCE: u64 = 1;

    unsafe fn cfstr(s: &str) -> CFStringRef {
        let c = CString::new(s).unwrap();
        CFStringCreateWithCString(ptr::null(), c.as_ptr(), kCFStringEncodingUTF8)
    }

    unsafe fn new_dict() -> CFMutableDictionaryRef {
        CFDictionaryCreateMutable(
            ptr::null(),
            0,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks,
        )
    }

    unsafe fn add(d: CFMutableDictionaryRef, k: CFTypeRef, v: CFTypeRef) {
        CFDictionaryAddValue(d, k as *const _, v as *const _);
    }

    pub fn set(service: &str, account: &str, password: &str) -> Result<(), String> {
        unsafe {
            let access_ctrl = SecAccessControlCreateWithFlags(
                kCFAllocatorDefault as CFTypeRef,
                kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
                USER_PRESENCE,
                ptr::null_mut(),
            );
            if access_ctrl.is_null() {
                return Err("failed to create access control".into());
            }

            let svc = cfstr(service);
            let acct = cfstr(account);
            let label = cfstr("The Daily Ledger stores your OpenAI API key here.");
            let data = CFDataCreate(ptr::null(), password.as_ptr(), password.len() as isize);

            let d = new_dict();
            add(d, kSecClass, kSecClassGenericPassword);
            add(d, kSecAttrService, svc as CFTypeRef);
            add(d, kSecAttrAccount, acct as CFTypeRef);
            add(d, kSecAttrLabel, label as CFTypeRef);
            add(d, kSecAttrAccessControl, access_ctrl);
            add(d, kSecValueData, data as CFTypeRef);

            let status = SecItemAdd(d as CFTypeRef, ptr::null_mut());

            CFRelease(d as CFTypeRef);
            CFRelease(data as CFTypeRef);
            CFRelease(svc as CFTypeRef);
            CFRelease(acct as CFTypeRef);
            CFRelease(label as CFTypeRef);
            CFRelease(access_ctrl);

            if status == errSecSuccess {
                Ok(())
            } else {
                Err(format!("keychain write error: {status}"))
            }
        }
    }

    pub fn get(service: &str, account: &str) -> Result<String, String> {
        unsafe {
            let svc = cfstr(service);
            let acct = cfstr(account);

            let d = new_dict();
            add(d, kSecClass, kSecClassGenericPassword);
            add(d, kSecAttrService, svc as CFTypeRef);
            add(d, kSecAttrAccount, acct as CFTypeRef);
            add(d, kSecReturnData, kCFBooleanTrue as CFTypeRef);
            add(d, kSecMatchLimit, kSecMatchLimitOne);

            let mut result: CFTypeRef = ptr::null();
            let status = SecItemCopyMatching(d as CFTypeRef, &mut result);

            CFRelease(d as CFTypeRef);
            CFRelease(svc as CFTypeRef);
            CFRelease(acct as CFTypeRef);

            match status {
                s if s == errSecSuccess => {
                    let data = result as CFDataRef;
                    let len = CFDataGetLength(data) as usize;
                    let bytes = std::slice::from_raw_parts(CFDataGetBytePtr(data), len);
                    let key = String::from_utf8(bytes.to_vec()).map_err(|e| e.to_string())?;
                    CFRelease(result);
                    Ok(key)
                }
                s if s == errSecItemNotFound => Err("not found".into()),
                s => Err(format!("keychain read error: {s}")),
            }
        }
    }

    pub fn delete(service: &str, account: &str) -> Result<(), String> {
        unsafe {
            let svc = cfstr(service);
            let acct = cfstr(account);

            let d = new_dict();
            add(d, kSecClass, kSecClassGenericPassword);
            add(d, kSecAttrService, svc as CFTypeRef);
            add(d, kSecAttrAccount, acct as CFTypeRef);

            let status = SecItemDelete(d as CFTypeRef);

            CFRelease(d as CFTypeRef);
            CFRelease(svc as CFTypeRef);
            CFRelease(acct as CFTypeRef);

            if status == errSecSuccess || status == errSecItemNotFound {
                Ok(())
            } else {
                Err(format!("keychain delete error: {status}"))
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .manage(CachedKey(Mutex::new(None)))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ledger.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            set_api_key,
            get_api_key,
            delete_api_key,
            set_key_local,
            get_key_local,
            delete_key_local,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
