import { User } from "@/types/user.types";
import { api } from "./client";

export async function getProfile(): Promise<User> {
  const { data } = await api.get("/user/profile");
  return data.profile;
}

export interface UpdateProfileDto {
  name?: string;
  avatarUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfile(profileData: UpdateProfileDto): Promise<{
  message: string;
  profile: User;
}> {
  const { data } = await api.put("/user/profile", profileData);

  return data;
}
