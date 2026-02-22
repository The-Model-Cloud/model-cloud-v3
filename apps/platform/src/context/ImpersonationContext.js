import { createContext, useContext, useState } from "react";

const ImpersonationContext = createContext();

export const ImpersonationProvider = ({ children }) => {
  const [impersonatedUid, setImpersonatedUid] = useState(null);

  return (
    <ImpersonationContext.Provider value={{ impersonatedUid, setImpersonatedUid }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => useContext(ImpersonationContext);
