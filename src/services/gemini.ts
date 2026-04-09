import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const IMCI_SYSTEM_PROMPT = `You are a clinical decision support assistant trained on WHO IMCI (Integrated Management of Childhood Illness) guidelines. 
A Community Health Volunteer (CHV) with basic training is reporting symptoms of a child patient in a rural setting with no doctor present. 
Assess the symptoms, return a diagnosis with confidence score, urgency level, and step-by-step action plan in plain language. 
Never recommend watchful waiting for danger signs. 
Danger signs include: convulsions, lethargy/unconsciousness, inability to drink/breastfeed, vomiting everything. 
If any danger sign is present, the urgency MUST be 'Critical' and immediate referral is mandatory.`;

export interface DiagnosisResult {
  diagnosis: string;
  confidence: number;
  urgency: 'Low' | 'Urgent' | 'Critical';
  actionPlan: string;
  dangerSignsDetected: string[];
}

export async function getDiagnosticAssessment(symptoms: string, ageMonths: number, temperature?: number): Promise<DiagnosisResult> {
  const prompt = `Patient Age: ${ageMonths} months. ${temperature ? `Temperature: ${temperature}°C.` : ''} Reported Symptoms: ${symptoms}`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: IMCI_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnosis: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          urgency: { type: Type.STRING, enum: ["Low", "Urgent", "Critical"] },
          actionPlan: { type: Type.STRING },
          dangerSignsDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["diagnosis", "confidence", "urgency", "actionPlan", "dangerSignsDetected"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getMalnutritionAssessment(imageBase64: string, symptomsContext: string): Promise<{ status: 'SAM' | 'MAM' | 'Normal', reasoning: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      },
      {
        text: `Analyze this photo of a child for signs of malnutrition (visible wasting, oedema, skin condition). 
        Context: ${symptomsContext}. 
        Classify as SAM (Severe Acute Malnutrition), MAM (Moderate Acute Malnutrition), or Normal. 
        Provide clinical reasoning.`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["SAM", "MAM", "Normal"] },
          reasoning: { type: Type.STRING }
        },
        required: ["status", "reasoning"]
      }
    }
  });

  return JSON.parse(response.text);
}
