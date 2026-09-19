import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { SERVER_URL } from "./AuthService";

class UploadService {
  async pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled) return null;
    return result.assets[0];
  }

  async pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;
    return result.assets[0];
  }

  async uploadFile(fileAsset, contentType) {
    const formData = new FormData();

    formData.append("file", {
      uri: fileAsset.uri,
      name: fileAsset.fileName || fileAsset.name || `file_${Date.now()}`,
      type: fileAsset.mimeType || "application/octet-stream",
    });
    formData.append("contentType", contentType);

    const response = await fetch(`${SERVER_URL}/api/upload`, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erreur upload");
    }

    return data;
  }
}

export default new UploadService();
