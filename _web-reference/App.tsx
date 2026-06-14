import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import {
  TabType,
  Product,
  CartItem,
  Story,
  Order,
  Category,
  Partner,
  FoodService,
} from "./types";
import Navbar from "./components/Navbar";
import MainTabContent from "./components/MainTabContent";

// Lazy loaded components
const CheckoutView = lazy(() => import("./components/CheckoutView"));
const AIAssistant = lazy(() => import("./components/AIAssistant"));

import { LoadingFallback } from "./components/LoadingFallback";

import { ShieldAlert } from "lucide-react";
import ConsentRequiredScreen from "./components/ConsentRequiredScreen";
import LegalDocumentPage from "./components/LegalDocumentPage";
import { AppLoadingScreen } from "./components/AppLoadingScreen";
import { AppHeader } from "./components/AppHeader";
import { AppVisualOverlays } from "./components/AppVisualOverlays";
import { AppShell } from "./components/AppShell";

import { db, auth } from "./services/firebase";
import { useAppStore } from "./store/useAppStore";

import { showToast } from "./utils/notifications";
import SbpPaymentModal from "./components/SbpPaymentModal";

import { useMarketSearch } from "./hooks/useMarketSearch";
import { usePendingPaymentFlow } from "./hooks/usePendingPaymentFlow";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useCheckoutFlow } from "./hooks/useCheckoutFlow";
import { useDailyRewardFlow } from "./hooks/useDailyRewardFlow";
import { useAdminActions } from "./hooks/useAdminActions";
import { useSecretCodeFlow } from "./hooks/useSecretCodeFlow";
import { useProfileActions } from "./hooks/useProfileActions";
import { useBonusCodeIntake } from "./hooks/useBonusCodeIntake";
import { useBonusCodeAutoRedeem } from "./hooks/useBonusCodeAutoRedeem";
import { useAppBackNavigation } from "./hooks/useAppBackNavigation";

const AppContent: React.FC = () => {
  // Intake bonus code from URL if present
  useBonusCodeIntake();

  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const handleSetActiveTab = React.useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  const [checkoutItems, setCheckoutItems] = useState<CartItem[] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  const [isSbpModalOpen, setIsSbpModalOpen] = useState(false);
  const [bonusSuccessMessage, setBonusSuccessMessage] = useState<string | null>(
    null,
  );

  // (handleCheckoutComplete logic moved to useCheckoutFlow)

  // Zustand Store
  const setUserData = useAppStore((state) => state.setUserData);
  const clearCart = useAppStore((state) => state.clearCart);
  const removeItemsFromCart = useAppStore((state) => state.removeItemsFromCart);
  const userEmail = useAppStore((state) => state.email);
  const setGlobalData = useAppStore((state) => state.setGlobalData);

  const marketItems = useAppStore((state) => state.marketItems);
  const foodItems = useAppStore((state) => state.foodItems);
  const foodServices = useAppStore((state) => state.foodServices);
  const categories = useAppStore((state) => state.categories);
  const stories = useAppStore((state) => state.stories);
  const partners = useAppStore((state) => state.partners);
  const bonusRate = useAppStore((state) => state.bonusRate);
  const setBonusRate = useAppStore((state) => state.setBonusRate);
  const streakInfo = useAppStore((state) => state.streakInfo);
  const addresses = useAppStore((state) => state.addresses);
  const orders = useAppStore((state) => state.orders);
  const onboardingVersion = useAppStore((state) => state.onboardingVersion);
  const isProfileLoading = useAppStore((state) => state.isProfileLoading);
  const setOnboardingVersion = useAppStore(
    (state) => state.setOnboardingVersion,
  );
  const [isOnboardingPreview, setIsOnboardingPreview] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      new URLSearchParams(window.location.search).get("onboarding") === "1"
    );
  });

  const [showOnboardingOverride, setShowOnboardingOverride] = useState(true);

  const CURRENT_ONBOARDING_VERSION = 1;

  const {
    isAuthReady,
    isAuthenticated,
    userId,
    isAdminUser,
    fetchOrders,
    consentStatusLoading,
    hasRequiredConsents,
    consentStatusError,
    checkConsents,
    isRulesUpdated,
  } = useAppBootstrap(activeTab);

  // Временный debug-override для тестирования реферального онбординга у админа.
  // Чтобы выключить: просто установите в false.
  const DEBUG_FORCE_REFERRAL_ONBOARDING_FOR_ADMIN = false;

  const shouldShowOnboarding =
    (isAuthenticated &&
      !isProfileLoading &&
      (onboardingVersion < CURRENT_ONBOARDING_VERSION ||
        (DEBUG_FORCE_REFERRAL_ONBOARDING_FOR_ADMIN && isAdminUser)) &&
      showOnboardingOverride) ||
    isOnboardingPreview;

  const {
    isSubmittingOrder,
    currentOrderId,
    currentOrderTotal,
    handleCheckoutComplete,
  } = useCheckoutFlow({
    userId,
    checkoutItems,
    setCheckoutItems,
    removeItemsFromCart,
    setUserData,
    setIsSbpModalOpen,
  });

  const {
    currentGmt9Day,
    isClaimedToday,
    streakIsActive,
    effectiveStreak,
    handleCollectReward,
  } = useDailyRewardFlow({
    userId,
    setIsAuthPromptOpen,
  });

  const {
    debouncedSearchQuery,
    searchResults,
    hasMoreResults,
    totalResultsCount,
  } = useMarketSearch(marketItems, searchQuery);

  const { isConfirmingPayment, completeSuccessfulPayment, handlePaidCheck } =
    usePendingPaymentFlow({
      userId,
      isAuthenticated,
      isAuthReady,
      removeItemsFromCart,
      itemsToRemove: checkoutItems,
      fetchOrders,
      setCheckoutItems,
      setIsSbpModalOpen,
    });

  const { handleUpdateAdminData } = useAdminActions({
    userId,
  });

  const { handleVerifySecretCode } = useSecretCodeFlow({
    userId,
    setIsAuthPromptOpen,
  });

  // Auto-redeem pending bonus code if user is authenticated
  useBonusCodeAutoRedeem({
    isAuthReady,
    isAuthenticated,
    handleVerifySecretCode,
    onSuccess: (message) => {
      setBonusSuccessMessage(message);
      handleSetActiveTab("event");
    },
  });

  const { handleAddAddress, handleUpdateAddress, handleDeleteAddress } =
    useProfileActions({
      userId,
      addresses,
      setUserData,
    });

  const scrollPageToTop = React.useCallback(() => {
    const run = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      const scrollingElement = document.scrollingElement as HTMLElement | null;
      if (scrollingElement) scrollingElement.scrollTop = 0;

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const root = document.getElementById("root");
      if (root) root.scrollTop = 0;

      const appTop = document.getElementById("app-scroll-top");
      if (appTop) {
        appTop.scrollIntoView({ block: "start", behavior: "auto" });
      }
    };

    run();
    requestAnimationFrame(run);
    setTimeout(run, 0);
  }, []);

  const handleOnboardingComplete = React.useCallback(() => {
    if (isOnboardingPreview) {
      setIsOnboardingPreview(false);
    } else {
      setOnboardingVersion(CURRENT_ONBOARDING_VERSION);
      setShowOnboardingOverride(false);
    }
  }, [isOnboardingPreview, setOnboardingVersion, CURRENT_ONBOARDING_VERSION]);

  const handleOnboardingGoToReward = React.useCallback(() => {
    handleSetActiveTab("event");
    // Small delay to ensure tab is switched before scrolling or highlighting
    setTimeout(() => {
      const rewardBlock =
        document.getElementById("daily-reward-block");
      if (rewardBlock) {
        rewardBlock.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        rewardBlock.classList.add(
          "ring-4",
          "ring-[#5655FF]/30",
          "transition-all",
        );
        setTimeout(
          () =>
            rewardBlock.classList.remove(
              "ring-4",
              "ring-[#5655FF]/30",
            ),
          3000,
        );
      }
    }, 100);
  }, [handleSetActiveTab]);

  useAppBackNavigation({
    activeTab,
    handleSetActiveTab,
    checkoutItems,
    setCheckoutItems,
    selectedProduct,
    setSelectedProduct,
    selectedStory,
    setSelectedStory,
    isSbpModalOpen,
    setIsSbpModalOpen,
    isAuthPromptOpen,
    setIsAuthPromptOpen,
    bonusSuccessMessage,
    setBonusSuccessMessage,
    scrollPageToTop,
  });

  // Scroll to top on tab change
  useEffect(() => {
    scrollPageToTop();
  }, [activeTab]);

  const handleTabClick = (tab: TabType) => {
    if (tab === activeTab) {
      scrollPageToTop();
      return;
    }
    handleSetActiveTab(tab);
  };

  useEffect(() => {
    if (selectedProduct || checkoutItems) {
      scrollPageToTop();
    }
  }, [selectedProduct?.id, !!checkoutItems]);

  if (!isAuthReady) {
    return <AppLoadingScreen title="Загрузка Города" fadeIn />;
  }

  if (isConfirmingPayment) {
    return (
      <AppLoadingScreen
        title="Подтверждаем оплату..."
        subtitle="Пожалуйста, подождите, мы проверяем статус вашего платежа."
      />
    );
  }

  if (isAuthenticated && (consentStatusLoading || hasRequiredConsents === null) && !consentStatusError) {
    return <AppLoadingScreen title="Загрузка Города" />;
  }

  if (isAuthenticated && consentStatusError) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 text-center space-y-6 w-full max-w-[480px] mx-auto">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner animate-pulse">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[#111827] uppercase tracking-tight">
            Не удалось проверить соглашения
          </h2>
          <p className="text-sm font-medium text-gray-500 px-6">
            Проверьте интернет и попробуйте ещё раз.
          </p>
        </div>
        <button
          onClick={() => checkConsents()}
          className="bg-[#111827] hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all w-full max-w-[240px] flex items-center justify-center"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (isAuthenticated && hasRequiredConsents === false && !consentStatusError) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] w-full max-w-[480px] mx-auto relative">
        <ConsentRequiredScreen 
          onAccepted={() => checkConsents({ force: true })} 
          isUpdate={isRulesUpdated}
        />
      </div>
    );
  }

  return (
    <AppShell
      showHeader={activeTab !== "admin"}
      mainContentClassName={checkoutItems || selectedProduct ? "hidden" : "block"}
      aiAssistant={
        <Suspense fallback={null}>
          <AIAssistant />
        </Suspense>
      }
      header={
        <AppHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onLoginClick={() => setIsAuthPromptOpen(true)}
          onNavigateProfile={() => handleSetActiveTab("profile")}
        />
      }
      bottomNavigation={
        <Navbar activeTab={activeTab} setActiveTab={handleTabClick} />
      }
      overlays={
        <>
          {/* Overlay Layers */}
          {checkoutItems && (
            <Suspense fallback={<LoadingFallback />}>
              <CheckoutView
                items={checkoutItems}
                onClose={() => {
                  setCheckoutItems(null);
                }}
                onComplete={handleCheckoutComplete}
                savedAddresses={addresses}
                onAddAddress={handleAddAddress}
                onUpdateAddress={handleUpdateAddress}
                onDeleteAddress={handleDeleteAddress}
                defaultEmail={userEmail || ""}
                isSubmitting={isSubmittingOrder}
              />
            </Suspense>
          )}

          {currentOrderId && (
            <SbpPaymentModal
              isOpen={isSbpModalOpen}
              onClose={() => setIsSbpModalOpen(false)}
              onPaidCheck={() => handlePaidCheck(currentOrderId)}
              onPaymentSuccess={() => completeSuccessfulPayment(currentOrderId)}
              orderId={currentOrderId}
              total={currentOrderTotal}
            />
          )}

          <AppVisualOverlays
            isAuthPromptOpen={isAuthPromptOpen}
            setIsAuthPromptOpen={setIsAuthPromptOpen}
            selectedSellerId={selectedSellerId}
            setSelectedSellerId={setSelectedSellerId}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            selectedStory={selectedStory}
            setSelectedStory={setSelectedStory}
            bonusSuccessMessage={bonusSuccessMessage}
            setBonusSuccessMessage={setBonusSuccessMessage}
            handleSetActiveTab={handleSetActiveTab}
            shouldShowOnboarding={shouldShowOnboarding}
            isOnboardingPreview={isOnboardingPreview}
            onOnboardingComplete={handleOnboardingComplete}
            onOnboardingGoToReward={handleOnboardingGoToReward}
          />
        </>
      }
    >
      <MainTabContent
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        search={{
          debouncedSearchQuery,
          setSearchQuery,
          searchResults,
          totalResultsCount,
          hasMoreResults,
        }}
        reward={{
          streakIsActive,
          effectiveStreak,
          handleCollectReward,
          isClaimedToday,
        }}
        user={{
          userId,
          setIsAuthPromptOpen,
          orders,
          addresses,
          isAdminUser,
          setUserData,
          fetchOrders,
        }}
        data={{
          stories,
          partners,
          marketItems,
          foodItems,
          categories,
          foodServices,
          bonusRate,
          setBonusRate,
          setGlobalData,
        }}
        actions={{
          setSelectedProduct,
          setSelectedStory,
          handleVerifySecretCode,
          setCheckoutItems,
          handleUpdateAdminData,
        }}
      />
    </AppShell>
  );
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("app:navigation", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("app:navigation", handleLocationChange);
    };
  }, []);

  const isLegalPath = currentPath === "/legal" || currentPath.startsWith("/legal/");

  if (isLegalPath) {
    return <LegalDocumentPage pathname={currentPath} />;
  }

  return <AppContent />;
};

export default App;
