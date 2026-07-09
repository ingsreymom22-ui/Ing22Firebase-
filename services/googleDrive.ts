import { getAuth, GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'firebase/auth';

let cachedGoogleAccessToken: string | null = null;

export const connectGoogleDrive = async (): Promise<string | null> => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  try {
    if (auth.currentUser) {
      // Try to link first if the user is already signed in with a different provider
      try {
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedGoogleAccessToken = credential.accessToken;
          return credential.accessToken;
        }
      } catch (linkError: any) {
        // If the credential is already in use, or provider is already linked, 
        // we can just re-authenticate with signInWithPopup to get a fresh token.
        if (linkError.code === 'auth/credential-already-in-use' || linkError.code === 'auth/provider-already-linked') {
           const result = await signInWithPopup(auth, provider);
           const credential = GoogleAuthProvider.credentialFromResult(result);
           if (credential?.accessToken) {
             cachedGoogleAccessToken = credential.accessToken;
             return credential.accessToken;
           }
        } else {
            throw linkError;
        }
      }
    } else {
      // User is not signed in to Firebase at all, just sign in
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedGoogleAccessToken = credential.accessToken;
        return credential.accessToken;
      }
    }
  } catch (err) {
    console.error("Google Drive connection error:", err);
    throw err;
  }
  
  return null;
};

export const getGoogleAccessToken = () => cachedGoogleAccessToken;

export const uploadDataToDrive = async (data: any, fileName: string = 'dpss_auto_backup.json') => {
  if (!cachedGoogleAccessToken) {
    throw new Error('Google Drive is not connected. Please connect first.');
  }

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const contentType = 'application/json';
  const metadata = {
    name: fileName,
    mimeType: contentType
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + contentType + '\r\n\r\n' +
    JSON.stringify(data) +
    close_delim;

  // First, check if file exists so we can update it instead of creating duplicates
  let existingFileId = null;
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false`, {
        headers: { Authorization: `Bearer ${cachedGoogleAccessToken}` }
    });
    if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
            existingFileId = searchData.files[0].id;
        }
    }
  } catch (err) {
      console.warn("Could not search for existing Drive backup:", err);
  }

  const url = existingFileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${cachedGoogleAccessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive Upload Failed: ${errorText}`);
  }

  return await res.json();
};
