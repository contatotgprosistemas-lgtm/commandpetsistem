import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

const signInMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function setupRolesResponse(roles: string[]) {
  const eqMock = vi.fn().mockResolvedValue({ data: roles.map((r) => ({ role: r })), error: null });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  fromMock.mockReturnValue({ select: selectMock });
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function submitLogin() {
  fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "x@y.com" } });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "senha123" } });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
}

beforeEach(() => {
  navigateMock.mockReset();
  toastMock.mockReset();
  signInMock.mockReset();
  signOutMock.mockClear();
  fromMock.mockReset();
});

describe("LoginPage - client role security", () => {
  it("BLOCKS login when user only has 'cliente' role and signs them out", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u-client" } }, error: null });
    setupRolesResponse(["cliente"]);

    renderLogin();
    await submitLogin();

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith("/portal/login");
    expect(navigateMock).not.toHaveBeenCalledWith("/");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Acesso restrito", variant: "destructive" })
    );
  });

  it("ALLOWS login when user is admin", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u-admin" } }, error: null });
    setupRolesResponse(["admin"]);

    renderLogin();
    await submitLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("ALLOWS login for users with both 'cliente' and a staff role", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u-mixed" } }, error: null });
    setupRolesResponse(["cliente", "atendente"]);

    renderLogin();
    await submitLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("ALLOWS operacional role", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u-op" } }, error: null });
    setupRolesResponse(["operacional"]);

    renderLogin();
    await submitLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("shows error toast on invalid credentials and does not navigate", async () => {
    signInMock.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });

    renderLogin();
    await submitLogin();

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Erro ao entrar", variant: "destructive" })
      )
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
