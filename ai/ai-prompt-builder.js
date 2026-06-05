export function buildDetectivePrompt(caseData, caseTitle, mainQuestion) {
  // Strip out heavy base64 fields to prevent payload bloating
  const sanitizedClues = (caseData.clues || []).map(clue => {
    const { image, ...rest } = clue;
    return rest;
  });

  const payload = {
    caseTitle,
    mainQuestion,
    caseData: {
      mode: caseData.mode,
      clues: sanitizedClues,
      locations: caseData.locations,
      characters: caseData.characters,
      redThreads: caseData.redThreads
    }
  };

  return `
Judul kasus: ${caseTitle}
Pertanyaan utama: ${mainQuestion}

Data kasus JSON:
${JSON.stringify(payload, null, 2)}

Silakan analisis data di atas sesuai dengan system instruction Anda.
`;
}

