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
  createFavouriteList as createFavouriteListUtil,
  deleteFavouriteList as deleteFavouriteListUtil,
  addModelToList as addModelToListUtil,
  removeModelFromList as removeModelFromListUtil,
  LIST_OWNER_TYPES,
} from "../utils/favourites";

const FavouritesContext = createContext();

export const FavouritesProvider = ({ children }) => {
  const { user } = useAuth();
  const [favouriteModelIds, setFavouriteModelIds] = useState([]);
  const [favouriteLists, setFavouriteLists] = useState([]); // Personal lists
  const [organisationLists, setOrganisationLists] = useState([]); // Org lists
  const [teamLists, setTeamLists] = useState([]); // Team lists
  const [loading, setLoading] = useState(true);

  // Subscribe to user's favouriteModelIds field and all accessible lists
  useEffect(() => {
    if (!user?.uid) {
      setFavouriteModelIds([]);
      setFavouriteLists([]);
      setOrganisationLists([]);
      setTeamLists([]);
      setLoading(false);
      return;
    }

    const unsubscribers = [];

    // Listen to user document for quick favourites
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFavouriteModelIds(data.favouriteModelIds || []);
        }
      },
      (error) => {
        console.error("Error listening to user favourites:", error);
        setFavouriteModelIds([]);
      }
    );
    unsubscribers.push(unsubscribeUser);

    // Listen to personal favourite lists
    const personalListsQuery = query(
      collection(db, "favouriteLists"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribePersonalLists = onSnapshot(
      personalListsQuery,
      (snapshot) => {
        // Filter to only include personal lists (ownerType === "user" or undefined)
        const lists = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((list) => !list.ownerType || list.ownerType === "user");
        setFavouriteLists(lists);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to personal favourite lists:", error);
        if (error.message?.includes("index")) {
          console.error("Firestore composite index required. Check the console for a link to create it.");
        }
        setFavouriteLists([]);
        setLoading(false);
      }
    );
    unsubscribers.push(unsubscribePersonalLists);

    // Listen to organisation lists if user belongs to an org
    if (user.organisationId) {
      const orgListsQuery = query(
        collection(db, "favouriteLists"),
        where("organisationId", "==", user.organisationId),
        where("ownerType", "==", "organisation"),
        orderBy("createdAt", "desc")
      );

      const unsubscribeOrgLists = onSnapshot(
        orgListsQuery,
        (snapshot) => {
          const lists = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setOrganisationLists(lists);
        },
        (error) => {
          console.error("Error listening to organisation lists:", error);
          setOrganisationLists([]);
        }
      );
      unsubscribers.push(unsubscribeOrgLists);
    } else {
      setOrganisationLists([]);
    }

    // Listen to team lists if user belongs to a team
    if (user.teamId) {
      const teamListsQuery = query(
        collection(db, "favouriteLists"),
        where("teamId", "==", user.teamId),
        where("ownerType", "==", "team"),
        orderBy("createdAt", "desc")
      );

      const unsubscribeTeamLists = onSnapshot(
        teamListsQuery,
        (snapshot) => {
          const lists = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setTeamLists(lists);
        },
        (error) => {
          console.error("Error listening to team lists:", error);
          setTeamLists([]);
        }
      );
      unsubscribers.push(unsubscribeTeamLists);
    } else {
      setTeamLists([]);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user?.uid, user?.organisationId, user?.teamId]);

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
    async ({
      title,
      description,
      visibility = "private",
      linkedJobId = null,
      linkedJobTitle = null,
      ownerType = LIST_OWNER_TYPES.USER,
      organisationId = null,
      organisationName = null,
      teamId = null,
      teamName = null,
    }) => {
      if (!user?.uid) throw new Error("Must be logged in");

      const owner = {
        uid: user.uid,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        role: user.role,
      };

      // Use user's org/team if creating org/team list and not specified
      const finalOrgId = organisationId || (ownerType !== LIST_OWNER_TYPES.USER ? user.organisationId : null);
      const finalTeamId = teamId || (ownerType === LIST_OWNER_TYPES.TEAM ? user.teamId : null);

      return await createFavouriteListUtil({
        title,
        description,
        owner,
        visibility,
        linkedJobId,
        linkedJobTitle,
        ownerType,
        organisationId: finalOrgId,
        organisationName: organisationName || user.companyName,
        teamId: finalTeamId,
        teamName,
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

  // Get lists that contain a specific model (all accessible lists)
  const getListsWithModel = useCallback(
    (modelUid) => {
      const allLists = [...favouriteLists, ...organisationLists, ...teamLists];
      return allLists.filter((list) => list.modelIds?.includes(modelUid));
    },
    [favouriteLists, organisationLists, teamLists]
  );

  // Get personal lists with a specific model
  const getPersonalListsWithModel = useCallback(
    (modelUid) => {
      return favouriteLists.filter((list) => list.modelIds?.includes(modelUid));
    },
    [favouriteLists]
  );

  // Get all lists combined (for display purposes)
  const allLists = [...favouriteLists, ...organisationLists, ...teamLists];

  // Get total favourited models count
  const totalFavourites = favouriteModelIds.length;

  // Get total lists count
  const totalLists = favouriteLists.length;
  const totalOrgLists = organisationLists.length;
  const totalTeamLists = teamLists.length;
  const totalAllLists = totalLists + totalOrgLists + totalTeamLists;

  // Check if user can create org/team lists
  const canCreateOrgList = !!user?.organisationId;
  const canCreateTeamList = !!user?.teamId;

  const value = {
    // State
    favouriteModelIds,
    favouriteLists,
    organisationLists,
    teamLists,
    allLists,
    loading,
    totalFavourites,
    totalLists,
    totalOrgLists,
    totalTeamLists,
    totalAllLists,

    // Permissions
    canCreateOrgList,
    canCreateTeamList,

    // Quick Favourites
    isModelFavourited,
    toggleQuickFavourite,

    // Lists
    createFavouriteList,
    deleteFavouriteList,
    addModelToList,
    removeModelFromList,
    getListsWithModel,
    getPersonalListsWithModel,

    // Constants
    LIST_OWNER_TYPES,
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
