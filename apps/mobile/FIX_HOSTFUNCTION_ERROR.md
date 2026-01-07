# Fixing HostFunction Type Error in React Native

## Problem
```
ERROR [Error: Exception in HostFunction: TypeError: expected dynamic type 'boolean', but had type 'string']
```

This error occurs when React Native's New Architecture (Fabric) receives a string value where a boolean is expected.

## Root Cause
The error happens because:
1. React Native's New Architecture (Fabric) has **strict type checking for native components**
2. **Shorthand boolean props** (like `multiline`, `secureTextEntry`) may not be properly converted
3. Boolean props need **explicit values** (`={true}`) or **boolean casting** (`={!!value}`)
4. Props like `{loading}` can be misinterpreted as object literals `{loading: loading}` instead of the variable value

## Solutions Applied

### 1. Fixed Shorthand Boolean Props (✅ Applied)
Changed all shorthand boolean props to explicit values:
- ❌ `multiline` → ✅ `multiline={true}`
- ❌ `secureTextEntry` → ✅ `secureTextEntry={true}`
- Fixed in: `login.js`, `QuickActionsModal.jsx`, `messages.js`

### 2. Added Boolean Casting (✅ Applied)
Used `!!` to ensure values are true booleans:
- `disabled={!!loading}` - Ensures loading is boolean, not undefined
- `visible={!!visible}` - Casts to boolean
- `refreshing={!!refreshing}` - Ensures boolean type
- Fixed in: `login.js`, `QuickActionsModal.jsx`, `index.js`

### 3. Explicit Screen Options (✅ Applied)
Updated all layout files to explicitly set boolean props:
- `apps/mobile/app/(tabs)/_layout.js` - Added `lazy: false` and `animation: 'shift'`
- `apps/mobile/app/_layout.js` - Added explicit `headerShown: false` on each screen
- `apps/mobile/app/(auth)/_layout.js` - Added `animation: 'none'` and explicit options

### 4. New Architecture Configuration (✅ Applied)
Enabled New Architecture explicitly in config files:
- `app.json` - Added `"newArchEnabled": true`
- `app.config.js` - Added `newArchEnabled: true` at root, iOS, and Android levels

## Additional Workarounds (If Issue Persists)

### Option A: Force Boolean Type Conversion
If you have custom props that might be strings, convert them explicitly:

```javascript
// Example in your screen components
const MyScreen = ({ someProp }) => {
  const booleanProp = someProp === true || someProp === 'true'; // Force boolean
  return <View accessible={booleanProp}>...</View>;
};
```

### Option B: Disable New Architecture Temporarily
If you need the app working immediately, you can temporarily disable New Architecture:

In `app.json` and `app.config.js`, change:
```javascript
newArchEnabled: false,  // Set to false instead of true
```

**Note:** This is NOT recommended as Expo Go forces New Architecture enabled.

### Option C: Use Development Build Instead of Expo Go
Create a development build which gives you more control:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Create development build for iOS
eas build --profile development --platform ios

# Or for Android
eas build --profile development --platform android
```

### Option D: Avoid Problematic Props (MOST COMMON ISSUE!)

#### Shorthand Boolean Props - DON'T USE THEM!
```javascript
// ❌ WRONG - Shorthand may not work with New Architecture
<TextInput multiline />
<TextInput secureTextEntry />

// ✅ CORRECT - Explicit boolean value
<TextInput multiline={true} />
<TextInput secureTextEntry={true} />
```

#### Boolean Casting with !!
```javascript
// ❌ WRONG - May be undefined or string
<TouchableOpacity disabled={loading} />
<Modal visible={visible} />

// ✅ CORRECT - Ensure true boolean
<TouchableOpacity disabled={!!loading} />
<Modal visible={!!visible} />
```

#### Environment Variables
```javascript
// ❌ WRONG - Environment variables are always strings!
const someSetting = process.env.EXPO_PUBLIC_SOME_SETTING;
<View enabled={someSetting} /> // "true" is a string, not boolean!

// ✅ CORRECT - Convert to boolean
const someSetting = process.env.EXPO_PUBLIC_SOME_SETTING === 'true';
<View enabled={!!someSetting} />
```

#### Object Literal Confusion
```javascript
// ❌ WRONG - {loading} creates object {loading: loading}
// This is rare but can happen in certain contexts
const props = { visible: {loading} }; // Wrong!

// ✅ CORRECT - Use the value directly
const props = { visible: loading }; // Or visible: !!loading
```

## Testing the Fix

1. Clear the Metro bundler cache:
```bash
cd apps/mobile
npx expo start --clear
```

2. Press `r` in the terminal to reload the app

3. If the error persists, check the stack trace for the specific component causing the issue

## Common Culprits Checklist

- [ ] Screen options with boolean props (headerShown, lazy, etc.)
- [ ] Modal props (visible, transparent, animationType)
- [ ] Environment variables used as booleans
- [ ] Config files (app.json, app.config.js)
- [ ] Component props expecting booleans
- [ ] React Native component props (accessible, disabled, editable, etc.)

## Still Not Working?

If the error persists after these fixes:

1. **Check the exact component in the stack trace:**
   Look at the error stack trace to identify which specific component is causing the issue.

2. **Search for implicit string conversions:**
   ```bash
   # Search for potential boolean props in your code
   grep -r "headerShown\|visible\|disabled\|editable\|accessible" apps/mobile/
   ```

3. **Verify no props are being spread from objects with string values:**
   ```javascript
   // Bad
   const options = { headerShown: "false" }; // String!
   <Stack.Screen {...options} />
   
   // Good
   const options = { headerShown: false }; // Boolean!
   <Stack.Screen {...options} />
   ```

4. **Check third-party components:**
   Some UI libraries might pass strings where booleans are expected. Check their documentation for proper usage.

## Related Issues
- https://github.com/expo/expo/issues/...
- https://github.com/software-mansion/react-native-screens/issues/...

## Need More Help?
If you're still experiencing issues, please:
1. Share the complete error stack trace
2. Identify the specific screen/component where the error occurs
3. Check if the error happens on all tabs or just specific ones

