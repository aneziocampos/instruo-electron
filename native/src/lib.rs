#![deny(clippy::all)]

use napi_derive::napi;
use std::ptr;

use accessibility_sys::*;
use core_foundation::base::{CFRelease, CFType, TCFType, CFTypeRef};
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::CFDictionary;
use core_foundation::string::CFString;
use core_graphics::geometry::{CGPoint, CGSize};

// ---------- ElementInfo (returned to JS) ----------

#[napi(object)]
pub struct ElementInfo {
    pub role: Option<String>,
    pub subrole: Option<String>,
    pub title: Option<String>,
    pub value: Option<String>,
    pub description: Option<String>,
    pub help: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub pid: i32,
    pub children_count: i32,
}

#[napi(object)]
pub struct ParentInfo {
    pub role: Option<String>,
    pub title: Option<String>,
}

// ---------- Permission checking ----------

#[napi]
pub fn check_accessibility(prompt: bool) -> bool {
    unsafe {
        if prompt {
            let key = CFString::wrap_under_get_rule(kAXTrustedCheckOptionPrompt);
            let opts = CFDictionary::from_CFType_pairs(&[
                (key.as_CFType(), CFBoolean::true_value().as_CFType()),
            ]);
            AXIsProcessTrustedWithOptions(opts.as_concrete_TypeRef())
        } else {
            AXIsProcessTrusted()
        }
    }
}

// ---------- Get element at screen position ----------

#[napi]
pub fn get_element_at_position(x: f64, y: f64) -> Option<ElementInfo> {
    unsafe {
        let system = AXUIElementCreateSystemWide();
        let mut element: AXUIElementRef = ptr::null_mut();
        let err = AXUIElementCopyElementAtPosition(system, x as f32, y as f32, &mut element);
        CFRelease(system as _);

        if err != kAXErrorSuccess || element.is_null() {
            return None;
        }

        let info = read_element_info(element);
        CFRelease(element as _);
        Some(info)
    }
}

// ---------- Get parent chain for hierarchy context ----------

#[napi]
pub fn get_parent_chain(x: f64, y: f64, max_depth: Option<i32>) -> Vec<ParentInfo> {
    let max = max_depth.unwrap_or(5) as usize;
    let mut parents = Vec::new();

    unsafe {
        let system = AXUIElementCreateSystemWide();
        let mut element: AXUIElementRef = ptr::null_mut();
        let err = AXUIElementCopyElementAtPosition(system, x as f32, y as f32, &mut element);
        CFRelease(system as _);

        if err != kAXErrorSuccess || element.is_null() {
            return parents;
        }

        let mut current = element;
        for _ in 0..max {
            let parent_attr = CFString::new(kAXParentAttribute);
            let mut parent: CFTypeRef = ptr::null();
            let err = AXUIElementCopyAttributeValue(
                current,
                parent_attr.as_concrete_TypeRef(),
                &mut parent,
            );

            if err != kAXErrorSuccess || parent.is_null() {
                break;
            }

            let parent_el = parent as AXUIElementRef;
            parents.push(ParentInfo {
                role: get_string_attr(parent_el, kAXRoleAttribute),
                title: get_string_attr(parent_el, kAXTitleAttribute),
            });

            if current != element {
                CFRelease(current as _);
            }
            current = parent_el;
        }

        if current != element {
            CFRelease(current as _);
        }
        CFRelease(element as _);
    }

    parents
}

// ---------- Get process name by PID ----------

#[napi]
pub fn get_process_name(pid: i32) -> Option<String> {
    unsafe {
        let app = AXUIElementCreateApplication(pid);
        let title = get_string_attr(app, kAXTitleAttribute);
        CFRelease(app as _);
        title
    }
}

// ---------- Internal helpers ----------

unsafe fn read_element_info(el: AXUIElementRef) -> ElementInfo {
    let mut pid: i32 = 0;
    let _ = AXUIElementGetPid(el, &mut pid);

    let position = get_point_attr(el, kAXPositionAttribute);
    let size = get_size_attr(el, kAXSizeAttribute);

    ElementInfo {
        role: get_string_attr(el, kAXRoleAttribute),
        subrole: get_string_attr(el, kAXSubroleAttribute),
        title: get_string_attr(el, kAXTitleAttribute),
        value: get_string_attr(el, kAXValueAttribute),
        description: get_string_attr(el, kAXDescriptionAttribute),
        help: get_string_attr(el, kAXHelpAttribute),
        x: position.map(|p| p.0),
        y: position.map(|p| p.1),
        width: size.map(|s| s.0),
        height: size.map(|s| s.1),
        pid,
        children_count: get_children_count(el).unwrap_or(0),
    }
}

/// Read a string attribute from an AXUIElement.
/// The `attr` parameter is one of the kAX*Attribute string constants (e.g., "AXRole").
unsafe fn get_string_attr(el: AXUIElementRef, attr: &str) -> Option<String> {
    let cf_attr = CFString::new(attr);
    let mut value: CFTypeRef = ptr::null();
    let err = AXUIElementCopyAttributeValue(el, cf_attr.as_concrete_TypeRef(), &mut value);
    if err != kAXErrorSuccess || value.is_null() {
        return None;
    }
    // Create Rule: we own the reference from "Copy" function
    let cf = CFType::wrap_under_create_rule(value);
    cf.downcast::<CFString>().map(|s| s.to_string())
}

unsafe fn get_point_attr(el: AXUIElementRef, attr: &str) -> Option<(f64, f64)> {
    let cf_attr = CFString::new(attr);
    let mut value: CFTypeRef = ptr::null();
    let err = AXUIElementCopyAttributeValue(el, cf_attr.as_concrete_TypeRef(), &mut value);
    if err != kAXErrorSuccess || value.is_null() {
        return None;
    }
    let mut point = CGPoint::new(0.0, 0.0);
    let ok = AXValueGetValue(
        value as _,
        kAXValueTypeCGPoint,
        &mut point as *mut CGPoint as *mut _,
    );
    CFRelease(value);
    if ok { Some((point.x, point.y)) } else { None }
}

unsafe fn get_size_attr(el: AXUIElementRef, attr: &str) -> Option<(f64, f64)> {
    let cf_attr = CFString::new(attr);
    let mut value: CFTypeRef = ptr::null();
    let err = AXUIElementCopyAttributeValue(el, cf_attr.as_concrete_TypeRef(), &mut value);
    if err != kAXErrorSuccess || value.is_null() {
        return None;
    }
    let mut size = CGSize::new(0.0, 0.0);
    let ok = AXValueGetValue(
        value as _,
        kAXValueTypeCGSize,
        &mut size as *mut CGSize as *mut _,
    );
    CFRelease(value);
    if ok { Some((size.width, size.height)) } else { None }
}

unsafe fn get_children_count(el: AXUIElementRef) -> Option<i32> {
    let cf_attr = CFString::new(kAXChildrenAttribute);
    let mut value: CFTypeRef = ptr::null();
    let err = AXUIElementCopyAttributeValue(el, cf_attr.as_concrete_TypeRef(), &mut value);
    if err != kAXErrorSuccess || value.is_null() {
        return None;
    }
    let arr = core_foundation::array::CFArray::<CFType>::wrap_under_create_rule(
        value as core_foundation_sys::array::CFArrayRef,
    );
    Some(arr.len() as i32)
}
