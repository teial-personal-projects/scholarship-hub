export interface Essay {
  essayId?: number;
  applicationId: number;
  theme?: string;
  units?: string;
  essayLink?: string;
  wordCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}