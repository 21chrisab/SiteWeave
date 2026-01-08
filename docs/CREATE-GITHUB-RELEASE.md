# Create GitHub Release Guide

## Quick Method (Using PowerShell Script)

1. **Get your GitHub Personal Access Token**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (full control of private repositories)
   - Copy the token

2. **Run the script**:
```powershell
.\create-github-release.ps1 -GitHubToken "your_token_here"
```

The script will:
- Create a GitHub release tagged `v1.0.35`
- Upload `SiteWeave Setup 1.0.35.exe`
- Upload the blockmap file
- Generate release notes

## Manual Method (Using GitHub Web UI)

1. **Go to GitHub Releases**:
   - Navigate to: https://github.com/21chrisab/SiteWeave/releases
   - Click "Draft a new release"

2. **Fill in release details**:
   - **Tag**: `v1.0.35` (create new tag)
   - **Title**: `SiteWeave v1.0.35`
   - **Description**: 
     ```
     ## SiteWeave Desktop v1.0.35

     ### New Features
     - B2B Multi-tenant onboarding with edge functions
     - Team management with permission-based access control
     - Setup wizard for new organization admins
     - Dynamic roles with granular permissions
     - Guest access for project collaborators

     ### Installation
     Download and run the installer below.
     ```

3. **Upload files**:
   - Drag and drop `release/SiteWeave Setup 1.0.35.exe`
   - (Optional) Drag and drop `release/SiteWeave Setup 1.0.35.exe.blockmap`

4. **Publish release**:
   - Click "Publish release"

## Using GitHub CLI (If Installed)

```bash
# Install GitHub CLI first: https://cli.github.com/
gh release create v1.0.35 \
  "release/SiteWeave Setup 1.0.35.exe" \
  --title "SiteWeave v1.0.35" \
  --notes "B2B Multi-tenant onboarding with edge functions and team management"
```

## Release Notes Template

```markdown
## SiteWeave Desktop v1.0.35

### 🎉 New Features
- **B2B Multi-tenant Onboarding**: Create organizations via edge function
- **Team Management**: Secure team management with `can_manage_team` permission
- **Setup Wizard**: Guided setup for new organization admins
- **Dynamic Roles**: Custom roles with granular permissions
- **Guest Access**: Project collaborators for subcontractors

### 🔧 Technical Improvements
- Fixed TypeScript configuration warnings
- Updated build process for Electron
- Improved permission system architecture

### 📦 Installation
1. Download `SiteWeave Setup 1.0.35.exe`
2. Run the installer
3. Follow the setup wizard

### 🔗 Links
- [Documentation](https://github.com/21chrisab/SiteWeave)
- [Changelog](https://github.com/21chrisab/SiteWeave/commits/main)
```

---

**Note**: The executable file is ~85MB, so make sure you have a stable internet connection for upload.
