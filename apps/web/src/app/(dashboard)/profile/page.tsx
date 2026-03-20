"use client";

import { PageHeader } from "@raven/ui";
import { ProfileForm } from "./components/profile-form";

const ProfilePage = () => {
  return (
    <div>
      <PageHeader description="Manage your profile settings." title="Profile" />
      <ProfileForm />
    </div>
  );
};

export default ProfilePage;
