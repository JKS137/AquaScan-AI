export type UserRole = 'admin' | 'analyst';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export type ContaminationLevel = 'safe' | 'moderate' | 'unsafe';
export type WaterType = 'potable' | 'environmental' | 'industrial' | 'unknown';

export interface WaterReport {
  id: string;
  analystId: string;
  analystName: string;
  imageUrl: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  waterType: WaterType;
  contaminationLevel: ContaminationLevel;
  aiResult: {
    confidence: number;
    detections: string[];
    healthRisk: string;
    explanation: string;
  };
  purificationAdvice: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}
