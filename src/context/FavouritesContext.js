/**
 * FavouritesContext - Provides favourites state and actions throughout the app
 * Manages quick favourites and favourite lists for the current user
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import {
  toggleQuickFavourite as toggleQuickFavouriteUtil,
  isModelFavourited as isModelFavouritedUtil,
  getUserFavouriteLists,
  createFavouriteList as createFavouriteListUtil,
  deleteFavouriteList as deleteFavouriteListUtil,
  addModelToList as addModelToListUtil,
  removeModelFromList as removeModelFromListUtil,
} from "../utils/favourites";

const FavouritesContext = createContext();

export const FavouritesProvider = ({ children }) => {
  const { user } = useAuth();
  const [favouriteModelIds, setFavouriteModelIds] = useState([]);
  const [favouriteLists, setFavouriteLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to user's favouriteModelIds field
  useEffect(() => {
    if (!user?.uid) {
      setFavouriteModelIds([]);
      setFavouriteLists([]);
      setLoading(false);
      return;
    }

    // Listen to user document for quick favourites
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFavouriteModelIds(data.favouriteModelIds || []);
      }
    });

    // Listen to favourite lists
    const listsQuery = query(
      collection(db, "favouriteLists"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeLists = onSnapshot(listsQuery, (snapshot) => {
      const lists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFavouriteLists(lists);
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeLists();
    };
  }, [user?.uid]);

  // Check if a model is favourited (quick favourites)
  const isModelFavourited = useCallback(
    (modelUid) => {
      return isModelFavouritedUtil(favouriteModelIds, modelUid);
    },
    [favouriteModelIds]
  );

  // Toggle quick favourite
  const toggleQuickFavourite = useCallback(
    async (modelUid) => {
      if (!user?.uid) return false;
      const isFavourited = isModelFavourited(modelUid);
      return await toggleQuickFavouriteUtil(user.uid, modelUid, isFavourited);
    },
    [user?.uid, isModelFavourited]
  );

  // Create a new favourite list
  const createFavouriteList = useCallback(
    async ({ title, description, visibility = "private", linkedJobId = null, linkedJobTitle = null }) => {
      if (!user?.uid) throw new Error("Must be logged in");

      const owner = {
        uid: user.uid,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        role: user.role,
      };

      return await createFavouriteListUtil({
        title,
        description,
        owner,
        visibility,
        linkedJobId,
        linkedJobTitle,
      });
    },
    [user]
  );

  // Delete a favourite list
  const deleteFavouriteList = useCallback(async (listId) => {
    await deleteFavouriteListUtil(listId);
  }, []);

  // Add model to a list
  const addModelToList = useCallback(async (listId, modelData) => {
    await addModelToListUtil(listId, modelData);
  }, []);

  // Remove model from a list
  const removeModelFromList = useCallback(async (listId, modelUid) => {
    await removeModelFromListUtil(listId, modelUid);
  }, []);

  // Get lists that contain a specific model
  const getListsWithModel = useCallback(
    (modelUid) => {
      return favouriteLists.filter((list) => list.modelIds?.includes(modelUid));
    },
    [favouriteLists]
  );

  // Get total favourited models count
  const totalFavourites = favouriteModelIds.length;

  // Get total lists count
  const totalLists = favouriteLists.length;

  const value = {
    // State
    favouriteModelIds,
    favouriteLists,
    loading,
    totalFavourites,
    totalLists,

    // Quick Favourites
    isModelFavourited,
    toggleQuickFavourite,

    // Lists
    createFavouriteList,
    deleteFavouriteList,
    addModelToList,
    removeModelFromList,
    getListsWithModel,
  };

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = () => {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error("useFavourites must be used within a FavouritesProvider");
  }
  return context;
};
