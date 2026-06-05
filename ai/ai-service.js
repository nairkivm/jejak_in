import { AI_CONFIG } from './ai-config.js';
import { buildDetectivePrompt } from './ai-prompt-builder.js';
import detectiveInstruction from './detective-instruction.md?raw';
import { GoogleGenAI } from "@google/genai";

const MOCK_REPORT = `
# Laporan Analisis Jejak.in

## 1. Ringkasan Kasus
Kasus ini melibatkan hilangnya benda berharga dalam ruangan tertutup. Target utama adalah mengidentifikasi pelaku. Berdasarkan data yang masuk, ada indikasi aktivitas aneh sebelum kejadian.

## 2. Kualitas Data
Data saat ini masih kurang presisi. Ada beberapa *clue* tanpa jam yang jelas, sehingga melemahkan konstruksi timeline.

## 3. Clue Paling Relevan
- Kaca pecah di jendela barat.
- Pintu tidak terkunci dari dalam.

## 4. Timeline Singkat
- **19:00**: Terakhir terlihat aman.
- **Waktu tidak presisi**: Terdengar suara aneh.
- **21:00**: Ditemukan hilang.

## 5. Analisis Hubungan Antar Clue
Kemungkinan ada hubungan antara jejak sepatu kotor dengan lumpur di taman, namun masih butuh verifikasi lebih lanjut. Jari yang menghubungkan kedua clue ini tampak logis.

## 6. Tokoh yang Paling Terkait
- Tokoh A (punya akses).
- Tokoh B (punya motif namun alibi kuat).

## 7. Skenario yang Dieliminasi
Keterlibatan orang luar acak sangat kecil kemungkinannya karena tidak ada tanda-tanda kerusakan pada sistem keamanan.

## 8. Tiga Hipotesis Terbaik
1. Orang dalam yang lupa mengunci pintu membuka jalan bagi kaki tangan.
2. Pelaku memecahkan kaca hanya sebagai pengalih perhatian, lalu masuk lewat pintu.
3. Benda tidak dicuri melainkan dipindahkan oleh pemilik karena panik.

## 9. Kesimpulan Akhir
Perlu dilakukan pengecekan terhadap alat pembersih lumpur untuk memverifikasi siapa yang baru saja kembali dari area taman.

*(Disclaimer: Laporan ini adalah hipotesis berbasis clue fiktif, bukan kesimpulan pasti atau tuduhan)*
`;

export const analyzeCase = async (caseTitle, mainQuestion, appState) => {
  if (!AI_CONFIG.enabled || AI_CONFIG.apiKey === "PASTE_YOUR_API_KEY_HERE") {
    // Return mock
    return new Promise(resolve => {
      setTimeout(() => resolve(MOCK_REPORT), 1500);
    });
  }

  const promptStr = buildDetectivePrompt(appState, caseTitle, mainQuestion);

  try {
    const ai = new GoogleGenAI({ apiKey: AI_CONFIG.apiKey.trim() });
    
    const response = await ai.models.generateContent({
      model: AI_CONFIG.model.trim(),
      contents: promptStr,
      config: {
        systemInstruction: detectiveInstruction,
        temperature: 0.3
      }
    });

    if (response && response.text) {
      return response.text;
    }
    return "Tidak ada hasil analisis.";

  } catch (err) {
    console.error("Gemini API Error", err);
    return "Terjadi kesalahan saat memanggil AI:\n" + err.message;
  }
};
