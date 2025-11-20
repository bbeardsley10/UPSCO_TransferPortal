# Testing Guide

## Testing with Multiple Users

To test the transfer functionality with multiple users simultaneously, you can use:

### Method 1: Incognito/Private Window (Easiest)
1. Open your regular browser window → `http://localhost:3000`
2. Log in as **Location 1** (username: `location1`, password: `password1`)
3. Open an incognito/private window:
   - **Chrome/Edge**: `Cmd+Shift+N` (Mac) or `Ctrl+Shift+N` (Windows)
   - **Firefox**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - **Safari**: `Cmd+Shift+N` (Mac)
4. In incognito window → `http://localhost:3000`
5. Log in as **Location 2** (username: `location2`, password: `password2`)

### Method 2: Different Browsers
- Use Chrome for one user and Firefox/Safari for another
- Each browser maintains separate cookie sessions

### Method 3: Different Browser Profiles
- Chrome: Create a new profile (Settings → Manage People → Add Person)
- Each profile has separate cookies and sessions

## Test Scenario

1. **Location 1** (regular window):
   - Click "Upload Transfer"
   - Select a PDF file
   - Choose "Location 2" as recipient
   - Click "Upload Transfer"
   - You should see the transfer in your "Sent" list

2. **Location 2** (incognito window):
   - Refresh the dashboard (or wait ~5 seconds for auto-refresh)
   - The new transfer should appear in "Received" list
   - Click on the transfer to view details
   - View the PDF in the iframe
   - Update status to "Acknowledged" or "In Progress"
   - Add notes
   - Click "Update Transfer"

3. **Location 1** (regular window):
   - Refresh or wait for auto-refresh
   - Click on the transfer you sent
   - You should see the updated status and notes from Location 2

## All Test Accounts

- **Location 1**: username=`location1`, password=`password1`
- **Location 2**: username=`location2`, password=`password2`
- **Location 3**: username=`location3`, password=`password3`
- **Location 4**: username=`location4`, password=`password4`
- **Location 5**: username=`location5`, password=`password5`

## Troubleshooting

- If you see "Not authenticated" errors, make sure you're using separate browser sessions
- The dashboard auto-refreshes every 5 seconds, or you can manually refresh
- PDFs should display in the iframe - if not, try the "Open in new tab" link

