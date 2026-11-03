"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DemoUserSession } from "@/types/feedback";

interface SessionContextType {
  user: DemoUserSession;
  switchUser: (newRole: "Teacher" | "Student" | "District Admin") => void;
}

const defaultTeacher: DemoUserSession = {
  id: "USR-8821A",
  name: "Sarah Jenkins",
  email: "sarah.j@lincolnhigh.edu",
  role: "Teacher",
  schoolName: "Lincoln High School",
  avatarInitials: "SJ",
};

const defaultStudent: DemoUserSession = {
  id: "USR-9932B",
  name: "Alex Rivera",
  email: "alex.r@lincolnhigh.edu",
  role: "Student",
  schoolName: "Lincoln High School",
  avatarInitials: "AR",
};

const defaultAdmin: DemoUserSession = {
  id: "USR-7710C",
  name: "Dr. Marcus Vance",
  email: "m.vance@district.edu",
  role: "District Admin",
  schoolName: "District Office",
  avatarInitials: "MV",
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUserSession>(defaultTeacher);

  const switchUser = (newRole: "Teacher" | "Student" | "District Admin") => {
    if (newRole === "Teacher") setUser(defaultTeacher);
    if (newRole === "Student") setUser(defaultStudent);
    if (newRole === "District Admin") setUser(defaultAdmin);
  };

  return (
    <SessionContext.Provider value={{ user, switchUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}