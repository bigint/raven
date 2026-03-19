import { Spinner } from "@raven/ui";

const DashboardLoading = () => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
};

export default DashboardLoading;
