import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import store from "../../store/store";
import Navbar from "../Navbar/Navbar";
import AuthGuard from "../AuthGuard/AuthGuard";
import LoginForm from "../LoginForm/LoginForm";
import DirectorDashboard from "../Dashboard/DirectorDashboard";
import GestiuneMasini from "../Director/GestiuneMasini";
import CereriTestDrive from "../Director/CereriTestDrive";
import CereriDiscount from "../Director/CereriDiscount";
import Tranzactii from "../Director/Tranzactii";
import AuditLog from "../Director/AuditLog";
import ClientHome from "../Client/ClientHome";
import CatalogMasini from "../Client/CatalogMasini";
import PaginaMasina from "../Client/PaginaMasina";
import WishlistMasini from "../Client/WishlistMasini";
import SimulareCredit from "../Client/SimulareCredit";
import RecomandareAI from "../Client/RecomandareAI";
import MecanicHome from "../Mecanic/MecanicHome";
import GestiunePiese from "../Mecanic/GestiunePiese";
import ReparatiiMecanic from "../Mecanic/ReparatiiMecanic";
import FisaReparatiePDF from "../Mecanic/FisaReparatiePDF";
import NotificariMecanic from "../Mecanic/NotificariMecanic";
import NotificariClient from "../Client/NotificariClient";
import AdaugaReparatie from "../Director/AdaugaReparatie";
import EstimariReparatii from "../Director/EstimariReparatii";
import RapoartePDF from "../Director/RapoartePDF";
import NotificariPanel from "../Director/NotificariPanel";
import Placeholder from "../Placeholder/Placeholder";

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginForm />} />

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Director Routes */}
          <Route
            path="/director"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <DirectorDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/director/masini"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <GestiuneMasini />
              </AuthGuard>
            }
          />
          <Route
            path="/director/tranzactii"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <Tranzactii />
              </AuthGuard>
            }
          />
          <Route
            path="/director/test-drive"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <CereriTestDrive />
              </AuthGuard>
            }
          />
          <Route
            path="/director/discount"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <CereriDiscount />
              </AuthGuard>
            }
          />
          <Route
            path="/director/audit-log"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <AuditLog />
              </AuthGuard>
            }
          />
          <Route
            path="/director/reparatii"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <AdaugaReparatie />
              </AuthGuard>
            }
          />
          <Route
            path="/director/estimari"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <EstimariReparatii />
              </AuthGuard>
            }
          />
          <Route
            path="/director/rapoarte"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <RapoartePDF />
              </AuthGuard>
            }
          />
          <Route
            path="/director/notificari"
            element={
              <AuthGuard roluriPermise={["Director"]}>
                <NotificariPanel />
              </AuthGuard>
            }
          />

          {/* Client Routes */}
          <Route
            path="/client"
            element={
              <AuthGuard roluriPermise={["Client"]}>
                <ClientHome />
              </AuthGuard>
            }
          />
          <Route
            path="/client/catalog"
            element={
              <AuthGuard roluriPermise={["Client", "Director"]}>
                <CatalogMasini />
              </AuthGuard>
            }
          />
          <Route
            path="/client/masina/:id"
            element={
              <AuthGuard roluriPermise={["Client", "Director"]}>
                <PaginaMasina />
              </AuthGuard>
            }
          />
          <Route
            path="/client/wishlist"
            element={
              <AuthGuard roluriPermise={["Client"]}>
                <WishlistMasini />
              </AuthGuard>
            }
          />
          <Route
            path="/client/simulare-credit"
            element={
              <AuthGuard roluriPermise={["Client"]}>
                <SimulareCredit />
              </AuthGuard>
            }
          />
          <Route
            path="/client/recomandare-ai"
            element={
              <AuthGuard roluriPermise={["Client"]}>
                <RecomandareAI />
              </AuthGuard>
            }
          />
          <Route
            path="/client/notificari"
            element={
              <AuthGuard roluriPermise={["Client"]}>
                <NotificariClient />
              </AuthGuard>
            }
          />

          {/* Mecanic Routes */}
          <Route
            path="/mecanic"
            element={
              <AuthGuard roluriPermise={["Mecanic"]}>
                <MecanicHome />
              </AuthGuard>
            }
          />
          <Route
            path="/mecanic/piese"
            element={
              <AuthGuard roluriPermise={["Mecanic"]}>
                <GestiunePiese />
              </AuthGuard>
            }
          />
          <Route
            path="/mecanic/reparatii"
            element={
              <AuthGuard roluriPermise={["Mecanic"]}>
                <ReparatiiMecanic />
              </AuthGuard>
            }
          />
          <Route
            path="/mecanic/fisa-reparatie"
            element={
              <AuthGuard roluriPermise={["Mecanic"]}>
                <FisaReparatiePDF />
              </AuthGuard>
            }
          />
          <Route
            path="/mecanic/notificari"
            element={
              <AuthGuard roluriPermise={["Mecanic"]}>
                <NotificariMecanic />
              </AuthGuard>
            }
          />

          {/* Acces interzis */}
          <Route
            path="/acces-interzis"
            element={
              <Placeholder
                title="Acces Interzis"
                description="Nu ai permisiunea să accesezi această pagină."
                icon="block"
              />
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <Placeholder
                title="404"
                description="Pagina nu a fost găsită."
                icon="search_off"
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
