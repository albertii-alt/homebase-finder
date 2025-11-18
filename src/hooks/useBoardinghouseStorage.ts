export type Room = {
  id: string;
  roomName: string;
  totalBeds: number;
  availableBeds: number;
  rentPrice: number;
  withCR: boolean;
  gender: string;
  cookingAllowed: boolean;
  inclusions: string[];
};

export type Boardinghouse = {
  id: string;
  ownerEmail: string;
  ownerName?: string; // <-- added optional ownerName to persist/display owner-entered name
  name: string;
  contact: string;
  address: string;
  description: string;
  facebook: string;
  photos: string[];
  rooms: Room[];
};

const STORAGE_KEY = "boardinghouses";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAll(): Boardinghouse[] {
  return safeParse<Boardinghouse[]>(localStorage.getItem(STORAGE_KEY), []);
}

function writeAll(data: Boardinghouse[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// new helper: push activity entry to localStorage activityLog (most-recent-first)
function pushActivity(entry: { ts: number; message: string; type?: string; meta?: any }) {
  try {
    const raw = localStorage.getItem("activityLog");
    const list = safeParse<Array<{ ts: number; message: string; type?: string; meta?: any }>>(raw, []);
    list.unshift(entry);
    // keep recent 200 entries to avoid unbounded growth
    if (list.length > 200) list.length = 200;
    localStorage.setItem("activityLog", JSON.stringify(list));
    // also trigger storage event for other windows/tabs (some browsers need setItem)
  } catch {
    // ignore
  }
}

/**
 * Return boardinghouses owned by the provided email.
 */
export function getBoardinghousesByOwner(ownerEmail: string): Boardinghouse[] {
  if (!ownerEmail) return [];
  const all = readAll();
  return all.filter((b) => b.ownerEmail === ownerEmail);
}

/**
 * Add a new boardinghouse. If id is missing, generates one.
 * Returns the created Boardinghouse.
 */
export function addBoardinghouse(newBoardinghouse: Boardinghouse): Boardinghouse {
  const all = readAll();
  const item: Boardinghouse = {
    ...newBoardinghouse,
    id: newBoardinghouse.id || genId("bh_"),
    ownerName: newBoardinghouse.ownerName ?? newBoardinghouse.ownerName ?? "",
    photos: newBoardinghouse.photos || [],
    rooms: newBoardinghouse.rooms || [],
  };
  all.unshift(item);
  writeAll(all);

  // record activity
  pushActivity({ ts: Date.now(), message: `Boardinghouse saved: ${item.name || item.id}`, type: "boardinghouse", meta: { id: item.id } });

  return item;
}

/**
 * Update an existing boardinghouse. Returns true if updated, false if not found.
 */
export function updateBoardinghouse(updatedBoardinghouse: Boardinghouse): boolean {
  const all = readAll();
  const idx = all.findIndex((b) => b.id === updatedBoardinghouse.id);
  if (idx === -1) return false;
  const preserved: Boardinghouse = {
    ...all[idx],
    ...updatedBoardinghouse,
    ownerName: updatedBoardinghouse.ownerName ?? all[idx].ownerName,
    photos: updatedBoardinghouse.photos ?? all[idx].photos,
    rooms: updatedBoardinghouse.rooms ?? all[idx].rooms,
  };
  all[idx] = preserved;
  writeAll(all);

  // record activity
  pushActivity({ ts: Date.now(), message: `Boardinghouse updated: ${preserved.name || preserved.id}`, type: "boardinghouse", meta: { id: preserved.id } });

  return true;
}

/**
 * Delete a boardinghouse by id. Returns true if deleted.
 */
export function deleteBoardinghouse(id: string): boolean {
  if (!id) return false;
  const all = readAll();
  const filtered = all.filter((b) => b.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);

  // record activity
  pushActivity({ ts: Date.now(), message: `Boardinghouse deleted: ${id}`, type: "boardinghouse", meta: { id } });

  return true;
}

/**
 * Add a room to a boardinghouse. Generates room.id if missing.
 * Returns the added Room or null if boardinghouse not found.
 */
export function addRoom(boardinghouseId: string, room: Room): Room | null {
  const all = readAll();
  const idx = all.findIndex((b) => b.id === boardinghouseId);
  if (idx === -1) return null;
  const newRoom: Room = {
    ...room,
    id: room.id || genId("room_"),
    totalBeds: Number(room.totalBeds) || 0,
    availableBeds: Number(room.availableBeds) || 0,
    rentPrice: Number(room.rentPrice) || 0,
    inclusions: room.inclusions || [],
  };
  all[idx].rooms = all[idx].rooms ? [newRoom, ...all[idx].rooms] : [newRoom];
  writeAll(all);

  // record activity
  pushActivity({ ts: Date.now(), message: `Room added: ${newRoom.roomName || newRoom.id}`, type: "room", meta: { bhId: boardinghouseId, roomId: newRoom.id } });

  return newRoom;
}

/**
 * Update a room inside a boardinghouse. Returns true if updated.
 */
export function updateRoom(boardinghouseId: string, updatedRoom: Room): boolean {
  const all = readAll();
  const bhIdx = all.findIndex((b) => b.id === boardinghouseId);
  if (bhIdx === -1) return false;
  const rooms = all[bhIdx].rooms || [];
  const roomIdx = rooms.findIndex((r) => r.id === updatedRoom.id);
  if (roomIdx === -1) return false;
  const merged: Room = {
    ...rooms[roomIdx],
    ...updatedRoom,
    totalBeds: Number(updatedRoom.totalBeds),
    availableBeds: Number(updatedRoom.availableBeds),
    rentPrice: Number(updatedRoom.rentPrice),
    inclusions: updatedRoom.inclusions ?? rooms[roomIdx].inclusions ?? [],
  };
  all[bhIdx].rooms[roomIdx] = merged;
  writeAll(all);

  // record activity
  pushActivity({ ts: Date.now(), message: `Room updated: ${merged.roomName || merged.id}`, type: "room", meta: { bhId: boardinghouseId, roomId: merged.id } });

  return true;
}

/**
 * Delete a room inside a boardinghouse. Returns true if deleted.
 */
export function deleteRoom(boardinghouseId: string, roomId: string): boolean {
  const all = readAll();
  const bhIdx = all.findIndex((b) => b.id === boardinghouseId);
  if (bhIdx === -1) return false;
  const rooms = all[bhIdx].rooms || [];
  const filtered = rooms.filter((r) => r.id !== roomId);
  if (filtered.length === rooms.length) return false;
  all[bhIdx].rooms = filtered;
  writeAll(all);

  // record activity
  pushActivity({ ts: Date.now(), message: `Room deleted: ${roomId}`, type: "room", meta: { bhId: boardinghouseId, roomId } });

  return true;
}

// { changed code }
// Added small helper exports to allow dashboard/global reads
export function getAllBoardinghouses(): Boardinghouse[] {
  return readAll();
}

export function getAllRooms(): Room[] {
  const all = readAll();
  return all.flatMap((b) => b.rooms || []);
}