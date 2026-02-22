import { Timestamp } from "firebase/firestore";

export interface CMSPage {
  slug: string;
  title: string;
  content: string;
  metaDescription: string;
  metaKeywords: string[];
  published: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ContactSubmission {
  id?: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
}
