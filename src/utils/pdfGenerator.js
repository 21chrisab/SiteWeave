/**
 * PDF Generator Utility for Credential Cards
 * Generates printable cards with user credentials and QR codes
 */

/**
 * Generate credential cards PDF
 * @param {Array} managedAccounts - Array of managed account objects
 * @param {Object} organization - Organization object
 */
export async function generateCredentialCards(managedAccounts, organization) {
  // Dynamic import of jsPDF and qrcode (lazy load to reduce bundle size)
  try {
    const [{ default: jsPDF }, { default: QRCode }] = await Promise.all([
      import('jspdf'),
      import('qrcode')
    ]);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [85, 55] // Credit card size (3.35" x 2.13")
    });

    // Generate download URL for the app
    const appDownloadUrl = 'https://siteweave.app/download'; // Update with actual URL

    for (let i = 0; i < managedAccounts.length; i++) {
      const account = managedAccounts[i];
      
      // Add new page for each card (except first)
      if (i > 0) {
        doc.addPage([85, 55]);
      }

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(appDownloadUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Card background (optional: light gray border)
      doc.setDrawColor(200, 200, 200);
      doc.rect(2, 2, 81, 51);

      // Organization name (small, top)
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(organization?.name || 'SiteWeave', 5, 8);

      // User name (large, prominent)
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(account.fullName, 5, 18);

      // Username
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Username: ${account.username}`, 5, 26);

      // PIN
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`PIN: ${account.password || account.pin}`, 5, 32);

      // QR Code (right side)
      doc.addImage(qrDataUrl, 'PNG', 50, 10, 30, 30);

      // Role name (bottom)
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(account.roleName || 'Team Member', 5, 48);

      // Instructions (very small, bottom right)
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text('Scan QR to download app', 45, 50);
    }

    // Save PDF
    const fileName = `${organization?.slug || 'credentials'}-cards.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Fallback: Show credentials in a simple format
    const credentialsText = managedAccounts.map(acc => 
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${acc.fullName}\n` +
      `Username: ${acc.username}\n` +
      `PIN: ${acc.password || acc.pin}\n` +
      `Role: ${acc.roleName || 'Team Member'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    ).join('\n');

    // Create a downloadable text file as fallback
    const blob = new Blob([credentialsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${organization?.slug || 'credentials'}-cards.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: false, error: error.message, fallback: true };
  }
}
