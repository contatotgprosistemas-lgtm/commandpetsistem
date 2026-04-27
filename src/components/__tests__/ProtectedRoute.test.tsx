import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Mock supabase client used by the blocked screen
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
  },
}));

// Mutable mock for useAuth
const authState: {
  user: any;
  loading: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  profile: any;
  signOut: () => Promise<void>;
} = {
  user: null,
  loading: false,
  isSuperAdmin: false,
  isApproved: false,
  profile: null,
  signOut: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

function renderWithRouter(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>MANAGEMENT DASHBOARD</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <div>ADMIN AREA</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.user = null;
  authState.loading = false;
  authState.isSuperAdmin = false;
  authState.isApproved = false;
  authState.profile = null;
});

describe("ProtectedRoute - client role security", () => {
  it("redirects unauthenticated users to /login", () => {
    authState.user = null;
    renderWithRouter("/");
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
    expect(screen.queryByText("MANAGEMENT DASHBOARD")).not.toBeInTheDocument();
  });

  it("BLOCKS users with role 'cliente' from accessing the management dashboard", () => {
    authState.user = { id: "u1", role: "cliente" };
    authState.isApproved = true;
    renderWithRouter("/");
    expect(screen.queryByText("MANAGEMENT DASHBOARD")).not.toBeInTheDocument();
    expect(screen.getByText(/Acesso restrito/i)).toBeInTheDocument();
    expect(screen.getByText(/Portal do Cliente/i)).toBeInTheDocument();
  });

  it("BLOCKS clients even when navigating directly to admin routes", () => {
    authState.user = { id: "u1", role: "cliente" };
    authState.isApproved = true;
    renderWithRouter("/admin");
    expect(screen.queryByText("ADMIN AREA")).not.toBeInTheDocument();
    expect(screen.getByText(/Acesso restrito/i)).toBeInTheDocument();
  });

  it("BLOCKS clients even when isApproved is true and isSuperAdmin is false", () => {
    authState.user = { id: "u1", role: "cliente" };
    authState.isApproved = true;
    authState.isSuperAdmin = false;
    renderWithRouter("/");
    expect(screen.queryByText("MANAGEMENT DASHBOARD")).not.toBeInTheDocument();
    expect(screen.getByText(/Acesso restrito/i)).toBeInTheDocument();
  });

  it("ALLOWS users with admin role to access management dashboard", () => {
    authState.user = { id: "u1", role: "admin" };
    authState.isApproved = true;
    renderWithRouter("/");
    expect(screen.getByText("MANAGEMENT DASHBOARD")).toBeInTheDocument();
  });

  it("ALLOWS users with operacional role to access management dashboard", () => {
    authState.user = { id: "u1", role: "operacional" };
    authState.isApproved = true;
    renderWithRouter("/");
    expect(screen.getByText("MANAGEMENT DASHBOARD")).toBeInTheDocument();
  });

  it("shows pending approval screen for non-client users not approved", () => {
    authState.user = { id: "u1", role: "atendente" };
    authState.isApproved = false;
    renderWithRouter("/");
    expect(screen.queryByText("MANAGEMENT DASHBOARD")).not.toBeInTheDocument();
    expect(screen.getByText(/Pendente de Aprovação/i)).toBeInTheDocument();
  });
});
