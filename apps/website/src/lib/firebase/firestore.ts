import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";
import type { CMSPage, ContactSubmission } from "@/types/cms";
import type { PricingTier } from "@/types/pricing";
import type { SiteContent, SiteContentId } from "@/types/siteContent";

// CMS Pages
export async function getCMSPage(slug: string): Promise<CMSPage | null> {
  const docRef = doc(db, "cmsPages", slug);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docSnap.data() as CMSPage;
}

export async function getAllCMSPages(): Promise<CMSPage[]> {
  const querySnapshot = await getDocs(collection(db, "cmsPages"));
  return querySnapshot.docs.map((doc) => doc.data() as CMSPage);
}

export async function saveCMSPage(slug: string, data: Partial<CMSPage>, userId: string) {
  const docRef = doc(db, "cmsPages", slug);
  await setDoc(
    docRef,
    {
      ...data,
      slug,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true }
  );
}

// Pricing Tiers
export async function getPricingTiers(publishedOnly = true): Promise<PricingTier[]> {
  // Use where clause for Firestore rules compliance, but sort client-side
  // to avoid needing a composite index on (published, order)
  let q;
  if (publishedOnly) {
    q = query(collection(db, "pricingTiers"), where("published", "==", true));
  } else {
    // Admin fetching all tiers - no filter needed
    q = query(collection(db, "pricingTiers"));
  }

  const querySnapshot = await getDocs(q);
  const tiers = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    // Normalize boolean fields that may be stored as strings
    return {
      id: doc.id,
      ...data,
      // Convert string "true"/"false" to actual booleans
      hide: data.hide === true || data.hide === "true",
      highlighted: data.highlighted === true || data.highlighted === "true",
      published: data.published === true || data.published === "true",
    } as PricingTier;
  });

  // Sort by order client-side
  tiers.sort((a, b) => (a.order || 0) - (b.order || 0));

  return tiers;
}

export async function savePricingTier(id: string, data: Partial<PricingTier>) {
  const docRef = doc(db, "pricingTiers", id);
  await setDoc(docRef, data, { merge: true });
}

export async function deletePricingTier(id: string) {
  await deleteDoc(doc(db, "pricingTiers", id));
}

// Contact Submissions
export async function submitContactForm(data: Omit<ContactSubmission, "id" | "createdAt" | "read">) {
  const docRef = doc(collection(db, "contactSubmissions"));
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    read: false,
  });
}

export async function getContactSubmissions(): Promise<ContactSubmission[]> {
  const q = query(collection(db, "contactSubmissions"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ContactSubmission));
}

export async function markContactAsRead(id: string) {
  await updateDoc(doc(db, "contactSubmissions", id), { read: true });
}

// Site Content
export async function getSiteContent<T extends SiteContent>(
  contentId: SiteContentId
): Promise<T | null> {
  const docRef = doc(db, "siteContent", contentId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}

export async function getSiteContentBatch(
  contentIds: SiteContentId[]
): Promise<Map<SiteContentId, SiteContent | null>> {
  const results = new Map<SiteContentId, SiteContent | null>();

  const promises = contentIds.map(async (id) => {
    const content = await getSiteContent(id);
    results.set(id, content);
  });

  await Promise.all(promises);
  return results;
}

export async function saveSiteContent(
  contentId: SiteContentId,
  data: Partial<SiteContent>,
  userId: string
): Promise<void> {
  const docRef = doc(db, "siteContent", contentId);
  await setDoc(
    docRef,
    {
      ...data,
      id: contentId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true }
  );
}

export async function getAllSiteContent(): Promise<SiteContent[]> {
  const querySnapshot = await getDocs(collection(db, "siteContent"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SiteContent[];
}
