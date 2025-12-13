# Chakra UI v3 Migration Plan

## Overview
This plan outlines the step-by-step process to upgrade the Scholarship Hub web application from Chakra UI v2.10.9 to v3. The migration involves breaking changes to components, theming, and the overall architecture.

## Prerequisites
- **Node.js**: Requires v20.x or higher (currently using Node.js, verify version)
- **Estimated Time**: 8-12 hours (40+ TypeScript files to update)
- **Risk Level**: Medium-High (many breaking changes, no automated codemod available)
- **Recommended Approach**: Step-by-step migration with testing after each phase

---

## Phase 1: Preparation & Environment Setup

### Step 1.1: Verify Node.js Version
```bash
node --version  # Should be 20.x or higher
```
If not, install Node 20 LTS before proceeding.

### Step 1.2: Create a Migration Branch
```bash
git checkout -b feature/chakra-v3-upgrade
```

### Step 1.3: Backup Current State
```bash
git add -A
git commit -m "Pre-Chakra v3 migration checkpoint"
```

### Step 1.4: Document Current Component Usage
Run analysis to understand what needs to change:
```bash
cd web/src
# Count Modal usage
grep -r "Modal" --include="*.tsx" | wc -l
# Count FormControl usage
grep -r "FormControl" --include="*.tsx" | wc -l
# Count useToast usage
grep -r "useToast" --include="*.tsx" | wc -l
# Count Tabs usage
grep -r "Tabs" --include="*.tsx" | wc -l
```

---

## Phase 2: Package Updates

### Step 2.1: Uninstall Deprecated Packages
```bash
cd web
npm uninstall @emotion/styled framer-motion
```

**Why**: Chakra UI v3 no longer depends on these packages.

### Step 2.2: Update Chakra UI and Emotion
```bash
npm install @chakra-ui/react@latest @emotion/react@latest
```

### Step 2.3: Install Required Snippets
```bash
npx @chakra-ui/cli snippet add
```

**What this does**: Downloads pre-built component compositions (like Toaster) that replace built-in v2 components.

### Step 2.4: Install Icon Library
Since `@chakra-ui/icons` is deprecated, install a replacement:
```bash
npm install lucide-react
# OR
npm install react-icons
```

**Recommendation**: Use `lucide-react` for consistency with modern React patterns.

### Step 2.5: Verify Package Installation
```bash
npm ls @chakra-ui/react
npm ls @emotion/react
```

---

## Phase 3: Theme Migration

### Step 3.1: Update Theme Configuration File
**File**: `web/src/theme.ts`

**Changes Required**:
1. Replace `extendTheme` with `createSystem`
2. Replace `ThemeConfig` with system config
3. Wrap all token values in objects with `value` key
4. Migrate `semanticTokens` to new format

**Before** (current):
```typescript
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#F7FAF4',
    // ...
  }
};
```

**After** (v3):
```typescript
import { createSystem, defaultConfig } from '@chakra-ui/react';

const customConfig = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#F7FAF4' },
          100: { value: '#F5F7F1' },
          // ... wrap all color values
        }
      }
    }
  }
});
```

### Step 3.2: Update Component Style Overrides
Component theming now uses "recipes" instead of `baseStyle` and `variants`.

**Migration needed for**:
- Button
- Card
- Badge
- FormLabel
- Table
- Heading

This will require rewriting each component's theme configuration using the recipe pattern.

### Step 3.3: Remove Color Mode Configuration
Chakra v3 uses `next-themes` for color mode. Remove:
- `ColorModeProvider`
- `useColorMode` references
- `LightMode`, `DarkMode` components

Install `next-themes`:
```bash
npm install next-themes
```

---

## Phase 4: Provider Setup Migration

### Step 4.1: Update main.tsx
**File**: `web/src/main.tsx`

**Current**:
```typescript
import { ChakraProvider } from '@chakra-ui/react';

<ChakraProvider theme={theme}>
  <AuthProvider>
    <App />
  </AuthProvider>
</ChakraProvider>
```

**New**:
```typescript
import { Provider } from '@chakra-ui/react';
import { ThemeProvider } from 'next-themes';

<Provider value={customConfig}>
  <ThemeProvider attribute="class" disableTransitionOnChange>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
</Provider>
```

---

## Phase 5: Component Migration (Critical Components First)

### Step 5.1: Migrate Toast System
**Files affected**:
- `web/src/utils/toast.ts`
- All files using `useToastHelpers` (10+ files)

**Current**:
```typescript
import { useToast } from '@chakra-ui/react';

export function useToastHelpers() {
  const toast = useToast();
  // ...
}
```

**New**: Use Toaster snippet
```bash
npx @chakra-ui/cli snippet add toaster
```

Then update:
```typescript
import { Toaster, toaster } from '@/components/ui/toaster';

// In main.tsx or App.tsx
<Provider>
  <Toaster />
  <App />
</Provider>

// Usage
toaster.create({
  title: 'Success',
  description: 'Action completed',
  type: 'success',
});
```

### Step 5.2: Migrate Modal → Dialog
**Files affected** (13 files):
- CollaboratorForm.tsx
- ApplicationForm.tsx
- EssayForm.tsx
- EditCollaborationModal.tsx
- AddCollaborationModal.tsx
- AssignCollaboratorModal.tsx
- SendInviteDialog.tsx

**Prop Changes**:
- `isOpen` → `open`
- `onClose` → `onOpenChange`
- `isCentered` → `placement="center"`
- `Modal` → `Dialog`
- `ModalOverlay` → `Dialog.Backdrop`
- `ModalContent` → `Dialog.Content`
- `ModalHeader` → `Dialog.Header`
- `ModalBody` → `Dialog.Body`
- `ModalCloseButton` → `Dialog.CloseTrigger`

**Example Migration**:
```typescript
// Before
<Modal isOpen={isOpen} onClose={onClose} isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Title</ModalHeader>
    <ModalCloseButton />
    <ModalBody>Content</ModalBody>
  </ModalContent>
</Modal>

// After
<Dialog.Root open={open} onOpenChange={onOpenChange}>
  <Dialog.Backdrop />
  <Dialog.Positioner>
    <Dialog.Content>
      <Dialog.Header>Title</Dialog.Header>
      <Dialog.CloseTrigger />
      <Dialog.Body>Content</Dialog.Body>
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>
```

### Step 5.3: Migrate FormControl → Field
**Files affected** (15+ files with forms)

**Changes**:
- `FormControl` → `Field.Root`
- `FormLabel` → `Field.Label`
- `FormHelperText` → `Field.HelperText`
- `FormErrorMessage` → `Field.ErrorText`
- `isInvalid` → `invalid`
- `isRequired` → `required`

**Example**:
```typescript
// Before
<FormControl isRequired isInvalid={!!error}>
  <FormLabel>Name</FormLabel>
  <Input />
  <FormHelperText>Helper text</FormHelperText>
  <FormErrorMessage>{error}</FormErrorMessage>
</FormControl>

// After
<Field.Root required invalid={!!error}>
  <Field.Label>Name</Field.Label>
  <Input />
  <Field.HelperText>Helper text</Field.HelperText>
  <Field.ErrorText>{error}</Field.ErrorText>
</Field.Root>
```

### Step 5.4: Migrate Stack Components
**Files affected**: Almost all component files use Stack, VStack, HStack

**Changes**:
- `spacing` → `gap`
- Remove `StackDivider` → use explicit `Stack.Separator`

**Example**:
```typescript
// Before
<Stack spacing="4" divider={<StackDivider />}>
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</Stack>

// After
<Stack gap="4">
  <Box>Item 1</Box>
  <Stack.Separator />
  <Box>Item 2</Box>
</Stack>
```

### Step 5.5: Migrate Tabs
**Files affected**:
- DashboardCollaborations.tsx
- DashboardPendingResponses.tsx

**Changes**:
- `TabPanel` → `Tabs.Content` (requires `value` prop)
- Index-based → value-based
- `isLazy` → `lazyMount` + `unmountOnExit`

**Example**:
```typescript
// Before
<Tabs index={activeTab} onChange={setActiveTab}>
  <TabList>
    <Tab>Tab 1</Tab>
    <Tab>Tab 2</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>Content 1</TabPanel>
    <TabPanel>Content 2</TabPanel>
  </TabPanels>
</Tabs>

// After
<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">Content 1</Tabs.Content>
  <Tabs.Content value="tab2">Content 2</Tabs.Content>
</Tabs.Root>
```

### Step 5.6: Migrate Divider → Separator
**Files affected**:
- CollaborationHistory.tsx

**Simple rename**:
```typescript
// Before
import { Divider } from '@chakra-ui/react';
<Divider />

// After
import { Separator } from '@chakra-ui/react';
<Separator />
```

### Step 5.7: Migrate Table Components
**Files affected**:
- DashboardCollaborations.tsx
- DashboardPendingResponses.tsx

**Changes**:
- `Th` → `Table.ColumnHeader`
- `Td` → `Table.Cell`
- `TableContainer` → `Table.ScrollArea`
- `isNumeric` → `textAlign="end"`

**Example**:
```typescript
// Before
<TableContainer>
  <Table>
    <Thead>
      <Tr>
        <Th>Name</Th>
        <Th isNumeric>Count</Th>
      </Tr>
    </Thead>
    <Tbody>
      <Tr>
        <Td>Item</Td>
        <Td isNumeric>5</Td>
      </Tr>
    </Tbody>
  </Table>
</TableContainer>

// After
<Table.ScrollArea>
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeader>Name</Table.ColumnHeader>
        <Table.ColumnHeader textAlign="end">Count</Table.ColumnHeader>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      <Table.Row>
        <Table.Cell>Item</Table.Cell>
        <Table.Cell textAlign="end">5</Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table.Root>
</Table.ScrollArea>
```

### Step 5.8: Update Boolean Props Throughout
**Global find and replace** in all `.tsx` files:
- `isOpen` → `open`
- `isDisabled` → `disabled`
- `isInvalid` → `invalid`
- `isRequired` → `required`
- `isLoading` → `loading`

**IMPORTANT**: Review each change manually to ensure it's appropriate for the component.

### Step 5.9: Update Style Props
- `colorScheme` → `colorPalette`
- `noOfLines` → `lineClamp`
- `truncated` → `truncate`

---

## Phase 6: Testing Strategy

### Step 6.1: Component-by-Component Testing
After migrating each component type:
1. Run TypeScript type check: `npm run type-check`
2. Run the dev server: `npm run dev`
3. Manually test the affected pages/components
4. Check for console errors

### Step 6.2: Run Existing Tests
```bash
npm run test
```

Update test files as needed for new component APIs.

### Step 6.3: Visual Regression Testing
Compare before/after screenshots of:
- Dashboard
- Application Detail page
- Forms (Collaborator, Application, Essay)
- Modals/Dialogs

---

## Phase 7: Build & Production Verification

### Step 7.1: Production Build
```bash
npm run build
```

Resolve any build errors.

### Step 7.2: Preview Production Build
```bash
npm run preview
```

Test key user flows.

---

## Phase 8: Cleanup & Documentation

### Step 8.1: Remove Old Code
- Remove any v2-specific workarounds
- Remove commented-out v2 code
- Clean up unused imports

### Step 8.2: Update Documentation
Update any developer documentation referencing Chakra UI components.

### Step 8.3: Final Commit
```bash
git add -A
git commit -m "Migrate to Chakra UI v3

- Updated all packages to v3
- Migrated theme system to createSystem
- Converted Modal → Dialog
- Converted FormControl → Field
- Updated all boolean props (is* → *)
- Migrated Toast to Toaster snippet
- Updated Tabs to value-based API
- Converted Divider → Separator
- Updated Table components to compound pattern
- Migrated Stack spacing → gap
- All tests passing
- Build successful"
```

---

## Rollback Plan

If migration fails or introduces critical bugs:

### Rollback Steps
1. **Immediate**: Revert to previous commit
   ```bash
   git reset --hard HEAD~1
   ```

2. **Package Rollback**:
   ```bash
   npm install @chakra-ui/react@2.10.9 @emotion/styled@11.14.1 framer-motion@12.23.24
   ```

3. **Test**: Verify application works
   ```bash
   npm run dev
   npm run test
   ```

---

## File Checklist

### Files Requiring Migration (in priority order)

#### Phase 1 - Core Infrastructure
- [ ] `web/package.json` - Package updates
- [ ] `web/src/theme.ts` - Theme migration
- [ ] `web/src/main.tsx` - Provider setup
- [ ] `web/src/utils/toast.ts` - Toast system

#### Phase 2 - Layout & Navigation
- [ ] `web/src/App.tsx` - Main app structure
- [ ] `web/src/components/Navigation.tsx` - Navigation component
- [ ] `web/src/components/ProtectedRoute.tsx` - Route guard

#### Phase 3 - Dashboard Components
- [ ] `web/src/pages/Dashboard.tsx`
- [ ] `web/src/components/DashboardCollaborations.tsx` - Uses Tabs, Table, Stack
- [ ] `web/src/components/DashboardPendingResponses.tsx` - Uses Tabs, Table, Stack
- [ ] `web/src/components/DashboardReminders.tsx`
- [ ] `web/src/components/CollaborationHistory.tsx` - Uses Divider, Stack

#### Phase 4 - Form Components
- [ ] `web/src/components/CollaboratorForm.tsx` - Modal, FormControl
- [ ] `web/src/components/ApplicationForm.tsx` - Modal, FormControl
- [ ] `web/src/components/EssayForm.tsx` - Modal, FormControl
- [ ] `web/src/components/EditCollaborationModal.tsx` - Modal, FormControl
- [ ] `web/src/components/AddCollaborationModal.tsx` - Modal, FormControl
- [ ] `web/src/components/AssignCollaboratorModal.tsx` - Modal, FormControl
- [ ] `web/src/components/SendInviteDialog.tsx` - Modal, FormControl

#### Phase 5 - Page Components
- [ ] `web/src/pages/Login.tsx`
- [ ] `web/src/pages/Register.tsx`
- [ ] `web/src/pages/ForgotPassword.tsx`
- [ ] `web/src/pages/ResetPassword.tsx`
- [ ] `web/src/pages/Profile.tsx`
- [ ] `web/src/pages/Applications.tsx`
- [ ] `web/src/pages/ApplicationDetail.tsx`
- [ ] `web/src/pages/Collaborators.tsx`
- [ ] `web/src/pages/CollaboratorDashboard.tsx`
- [ ] `web/src/pages/CollaboratorInvite.tsx`
- [ ] `web/src/pages/ScholarshipSearch.tsx`
- [ ] `web/src/pages/ScholarshipDetail.tsx`

#### Phase 6 - Test Files
- [ ] `web/src/test/helpers/render.tsx` - Test utilities
- [ ] `web/src/components/EssayForm.test.tsx`
- [ ] `web/src/components/SendInviteDialog.test.tsx`
- [ ] `web/src/components/AddCollaborationModal.test.tsx`
- [ ] `web/src/components/CollaborationHistory.test.tsx`
- [ ] `web/src/pages/Login.test.tsx`
- [ ] `web/src/pages/Register.test.tsx`
- [ ] `web/src/pages/Dashboard.test.tsx`
- [ ] `web/src/pages/Applications.test.tsx`
- [ ] `web/src/pages/ApplicationDetail.test.tsx`
- [ ] `web/src/pages/Collaborators.test.tsx`

---

## Common Pitfalls & Solutions

### Pitfall 1: Boolean Props Not Updated
**Error**: `Property 'isOpen' does not exist on type 'DialogProps'`
**Solution**: Search for all `is*` props and convert to non-prefixed versions

### Pitfall 2: Theme Not Applied
**Error**: Components appear unstyled
**Solution**: Ensure `createSystem` is properly configured and Provider wraps the app

### Pitfall 3: Toast Not Working
**Error**: `useToast is not a function`
**Solution**: Install Toaster snippet and use `toaster.create()` instead

### Pitfall 4: Table Styling Broken
**Error**: Table loses styling after migration
**Solution**: Ensure all `Th` → `Table.ColumnHeader` and `Td` → `Table.Cell` are updated

### Pitfall 5: Modal Doesn't Close
**Error**: Dialog remains open after clicking backdrop
**Solution**: Update `onClose` → `onOpenChange` and handle the callback parameter

---

## Resources

### Official Documentation
- [Chakra UI v3 Migration Guide](https://www.chakra-ui.com/docs/get-started/migration)
- [Chakra v2 vs v3 Comparison](https://chakra-ui.com/blog/chakra-v2-vs-v3-a-detailed-comparison)
- [LLMs Migration Guide](https://chakra-ui.com/llms-v3-migration.txt)

### Community Resources
- [Sprint 5 - Chakra UI v3 Migration](https://dev.to/theoforger/sprint-5-chakra-ui-v3-migration-4pfi)
- [Chakra UI v2 to v3 - The Hard Parts](https://codygo.com/blog/chakra-ui-v2-to-v3-easy-migration-guide/)
- [Migrate from Chakra UI v2 to v3 - Medium](https://kingchun1991.medium.com/migrate-from-chakra-ui-v2-to-chakra-ui-v3-part-1-1701dc3cd6ea)

### GitHub Discussions
- [Gradually upgrade from V2 to V3](https://github.com/chakra-ui/chakra-ui/discussions/9853)
- [How to upgrade to v3 incrementally?](https://github.com/chakra-ui/chakra-ui/discussions/9184)

---

## Estimated Timeline

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Preparation & Environment | 30 minutes |
| 2 | Package Updates | 15 minutes |
| 3 | Theme Migration | 1-2 hours |
| 4 | Provider Setup | 30 minutes |
| 5.1 | Toast Migration | 1 hour |
| 5.2 | Modal → Dialog (13 files) | 3-4 hours |
| 5.3 | FormControl → Field | 2-3 hours |
| 5.4-5.9 | Other Components | 2-3 hours |
| 6 | Testing | 2-3 hours |
| 7 | Build & Production | 1 hour |
| 8 | Cleanup | 30 minutes |
| **Total** | | **12-16 hours** |

---

## Success Criteria

- [ ] All packages updated to v3
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Production build succeeds
- [ ] All pages render correctly
- [ ] All forms functional
- [ ] All modals/dialogs work
- [ ] Toast notifications display
- [ ] Theme applied correctly
- [ ] No console errors in browser
- [ ] Performance is equal or better than v2

---

## Post-Migration

### Performance Validation
Chakra v3 promises:
- 4x improvement in reconciliation performance
- 1.6x improvement in re-render performance

Validate these improvements using React DevTools Profiler.

### Monitor for Issues
- Watch for user-reported bugs
- Monitor error tracking (if integrated)
- Check browser console errors in production

### Future Enhancements
With v3, consider:
- Using new slot recipes for better component composition
- Leveraging improved TypeScript support
- Exploring new animation capabilities (no longer dependent on framer-motion)
