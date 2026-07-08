import { getAccessToken } from './firebase';

export async function uploadToDrive(filename: string, content: any) {
  const token = getAccessToken();
  if (!token) {
    console.warn('No Google Drive access token available');
    return null;
  }

  try {
    const metadata = {
      name: filename,
      mimeType: 'application/json',
      description: 'Peak Performance Growth Portal Backup',
      // We could also put it in a specific folder "DPS_Backups"
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Drive API error details:', errorData);
      throw new Error(`Drive upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Successfully uploaded backup to Google Drive:', data.id);
    return data;
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    return null;
  }
}

export async function checkDriveAuth() {
  const token = getAccessToken();
  if (!token) return false;
  
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}
