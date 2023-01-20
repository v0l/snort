import { Outlet, RouteObject, useNavigate } from "react-router-dom";
import SettingsIndex from "Pages/settings/Index";
import Profile from "Pages/settings/Profile";
import Relay from "Pages/settings/Relays";
import Preferences from "Pages/settings/Preferences";

export default function SettingsPage() {
    const navigate = useNavigate();

    return (
        <>
            <h2 onClick={() => navigate("/settings")} className="pointer">Settings</h2>
            <Outlet />
        </>
    );
}

export const SettingsRoutes: RouteObject[] = [
    {
        path: "",
        element: <SettingsIndex />
    },
    {
        path: "profile",
        element: <Profile />
    },
    {
        path: "relays",
        element: <Relay />
    },
    {
        path: "preferences",
        element: <Preferences />
    }
]
