import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Interface from "./pages/Interface";
import MyBoardinghouse from "./pages/MyBoardinghouse";
import AddBoardinghouse from "./pages/AddBoardinghouse";
import EditBoardinghouse from "./pages/EditBoardinghouse";
import AddRoom from "./pages/AddRoom";
import EditRoom from "./pages/EditRoom";
import BoardinghouseDetails from "./pages/BoardinghouseDetails";
import AccountSettings from "./pages/AccountSettings";
import AddedRooms from "./pages/AddedRooms";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/index" element={<Index />} />
            <Route path="/interface" element={<Interface />} />
            <Route path="/boardinghouse/:id" element={<BoardinghouseDetails />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-boardinghouse" element={<MyBoardinghouse />} />
            <Route path="/add-boardinghouse" element={<AddBoardinghouse />} />
            <Route path="/edit-boardinghouse/:id" element={<EditBoardinghouse />} />
            <Route path="/add-room" element={<AddRoom />} />
            <Route path="/edit-room" element={<EditRoom />} />
            <Route path="/added-rooms" element={<AddedRooms />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
