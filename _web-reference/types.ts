
export type TabType = 'event' | 'food' | 'market' | 'cart' | 'profile' | 'admin';

export interface Story {
  id: string;
  title: string;
  image: string;
  type?: 'image' | 'video';
}

export interface Event {
  id: string;
  title: string;
  date: string;
  image: string;
  description: string;
  tag?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  imageUrl?: string | null;
}

export interface PickupPoint {
  id: string;
  name?: string | null;
  address: string;
  phone?: string | null;
  contacts?: string | null;
  workingHours?: string | null;
  pickupTime?: string | null;
  comment?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder?: number;
}

export interface FoodService {
  id: string;
  name: string;
  image: string;
  logo?: string;
  rating: number;
  deliveryTime: string;
  deliveryPrice: number;
  description: string;
  hasPromotion?: boolean;
  foodCategories?: string[];
  bonusPercent?: number; 
  minOrder?: number;
  freeDeliveryFrom?: number;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  preparationTime?: number;
  deliveryTimeValue?: number;
  pickupTime?: string | null;
  address?: string;
  pickupAddress?: string | null;
  pickupContacts?: string; // Устарело, используем pickupPoints
  pickupPoints?: PickupPoint[];
  categories?: FoodCategoryApi[];
  deliveryFee?: number;
  minOrderAmount?: number;
  pickupDiscountPercent?: number;
  onlinePaymentEnabled?: boolean;
  cashOnDeliveryEnabled?: boolean;
  fiscalizationOwner?: 'platform' | 'seller';
}

export interface ProductVariant {
  id: string;
  variantLabel: string;
  name?: string;
  stock?: number;
  isAvailable?: boolean;
  price: number;
  sku?: string;
  sortOrder?: number;
  sourceProductId?: string;
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  categoryId?: string;
  categoryObj?: FoodCategoryApi;
  description: string;
  type: 'market' | 'food';
  serviceId?: string;
  brand?: string;
  series?: string;
  gender?: 'Male' | 'Female' | 'Unisex';
  availableSizes?: string[];
  sizeStock?: Record<string, number>; // Новое поле: запас каждого размера
  availableVariants?: string[]; // Новое поле: варианты из Эвотора
  variantStock?: Record<string, number>; // Новое поле: остатки вариантов из Эвотора
  variantCodes?: Record<string, string>; // Новое поле: коды вариантов из Эвотора
  variants?: ProductVariant[]; // Новое поле для разных цен
  sku?: string;
  evotorArticle?: string; // Артикул из Эвотора
  pickupPointIds?: string[]; // Точки самовывоза
  color?: string;
  bonusMax?: number;
  maxBonusPercent?: number; // Максимальный процент списания бонусов
  sellerId?: string;
  sellerName?: string;
  sellerOnlinePaymentEnabled?: boolean;
  sellerCashOnDeliveryEnabled?: boolean;
  sellerFiscalizationOwner?: 'platform' | 'seller';
  isActive?: boolean;
  hasAvailableStock?: boolean;
  nutrition?: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  composition?: string;
  weight?: number;
  basePrice?: number;
  optionGroups?: FoodOptionGroupApi[];
  addOns?: FoodAddOn[];
  highlightsJson?: string[];
  specsJson?: Array<{ name: string; value: string }>;
}

export interface SellerStorefrontInfo {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  workingHours?: string | null;
  legalName?: string | null;
  legalInn?: string | null;
  legalOgrn?: string | null;
}

export interface SellerStorefrontResponse {
  seller: SellerStorefrontInfo;
  products: Product[];
}

export interface FoodAddOn {
  name: string;
  price: number;
}

export interface Address {
  id: string;
  address: string;
  entrance?: string;
  floor?: string;
  apt?: string;
  intercom?: string;
  comment?: string;
  name: string;
  phone: string;
}

export interface Order {
  id: string;
  date: string;
  createdAt?: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  bonusesUsed: number;
  earnedBonuses?: number;
  deliveryFee: number;
  method: 'pickup' | 'delivery';
  deliveryMethod?: 'pickup' | 'courier';
  address?: Address;
  pickupPoint?: PickupPoint;
  deliveryAddress?: string;
  comment?: string;
  email: string; // Почта для чека
  paymentMethod?: 'cash' | 'sbp';
  paymentStatus?: string;
  sourceChannel?: string;
  status: string;
  cancelStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'completed' | 'failed' | 'refund_pending' | 'refund_failed';
  returnStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'item_received' | 'refund_pending' | 'refunded' | 'closed';
  refundStatus?: 'none' | 'pending' | 'succeeded' | 'failed';
  cancelRequestedAt?: string;
  returnRequestedAt?: string;
}

export interface CartItem {
  id: string;
  sourceProductId?: string;
  type?: 'market' | 'food' | string;
  category?: string;

  name: string;
  title?: string;
  image?: string;
  images?: string[];

  brand?: string;
  sellerId?: string;
  serviceId?: string;
  sellerName?: string;
  seller?: string;
  sellerOnlinePaymentEnabled?: boolean;
  sellerCashOnDeliveryEnabled?: boolean;
  sellerFiscalizationOwner?: 'platform' | 'seller';

  price: number;
  originalPrice?: number;
  quantity: number;

  selectedBonus?: number;
  bonusMax?: number;
  maxBonusPercent?: number;

  selectedVariant?: string;
  selectedSize?: string;
  selectedVariantId?: string;
  sku?: string;

  selectedVariantObj?: {
    id?: string;
    variantLabel?: string;
    sku?: string;
    price?: number;
    stock?: number;
    isAvailable?: boolean;
  };

  variantStock?: Record<string, number>;
  sizeStock?: Record<string, number>;

  selectedOptions?: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceDelta: number;
  }[];
  selectedOptionsSummary?: string;
  basePrice?: number;
  isSelected?: boolean;
  selectedAddOns?: FoodAddOn[];

  itemId?: string;
  variantId?: string;
  masterProductId?: string;
  unitPrice?: number;
  lineTotal?: number;
}

export interface Transaction {
  id: string;
  title: string;
  date: string;
  createdAt?: string;
  amount: number;
  type: 'income' | 'outcome';
  iconType: 'scan' | 'prize' | 'promo' | 'welcome' | 'event';
}

export interface Partner {
  id: string;
  name: string;
  code: string;
  url: string;
  icon: string;
  type: 'tg' | 'ig';
  bonus: number;
}

export interface Settings {
  bonusRate: number; // 1 bonus = X currency (e.g., 0.5)
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  birthday?: string;
  gender?: 'Male' | 'Female' | '';
  userBalance?: number;
  streakInfo?: StreakInfo;
  addresses?: Address[];
  scannedCodes?: string[];
  transactions?: Transaction[];
  referralCode?: string;
  onboardingVersion?: number;
  isProfileLoading?: boolean;
}

export interface ReferralFriend {
  id: string;
  displayName: string;
  photoUrl?: string;
  status: 'code_applied' | 'activated' | 'qualified_purchase';
  date: string;
}

export interface ReferralData {
  referralCode: string;
  summary: {
    appliedCount: number;
    activatedCount: number;
    qualifiedPurchaseCount: number;
    totalBonusesEarned: number;
  };
  invitedFriends: ReferralFriend[];
  config: {
    activationBonus: number;
    qualifiedPurchaseBonus: number;
  };
}

export interface StreakInfo {
  lastClaimedDay: string;
  currentStreak: number;
}

export interface ClaimRewardResponse {
  success: boolean;
  amount: number;
  currentStreak: number;
  newBalance?: number;
  nextClaimAvailableAt?: string;
}

export interface SellerPickupPointInfo {
  sellerId: string;
  sellerName?: string;
  pickupPointId?: string | null;
  pickupPointName?: string | null;
  pickupPointAddress?: string | null;
  pickupPointWorkingHours?: string | null;
  pickupPointPhone?: string | null;
  pickupPointComment?: string | null;
  pickupTime?: string | null;
  note?: string;
}

export interface SubmitOrderPayload {
  items: {
    variantId: string;
    quantity: number;
  }[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
  bonusesUsed: number;
  deliveryFee: number;
  currency: string;
  deliveryAddress: string;
  deliveryType: 'delivery' | 'pickup';
  deliveryDetails?: {
    street?: string;
    house?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    intercom?: string;
    comment?: string;
  };
  deliveryComment?: string;
  comment: string;
  paymentMethod: 'cash' | 'sbp';
  pickupPointId?: string;
  pickupPointName?: string;
  pickupPointAddress?: string;
  pickupPointPhone?: string;
  pickupPointWorkingHours?: string;
  pickupTime?: string;
  pickupPointsBySeller?: SellerPickupPointInfo[];
}

export interface SubmitOrderResponse {
  id: string;
  status: string;
  message?: string;
  error?: string;
  code?: string;
}

export type AdminEntityType = 'market' | 'food' | 'story' | 'partner' | 'service';

export type AdminEntity = Product | Story | Partner | FoodService;

export interface SearchItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  type: 'market' | 'food';
  description: string;
}

export interface SocialRoutePoint {
  id: string;
  code: string;
  socialPointId: number;
  title: string;
  subtitle: string;
  description?: string;
  platform?: string;
  url?: string;
  logoUrl?: string;
  hint?: string;
  amount: number;
  isSecret?: boolean;
}

export interface SocialRouteProgress {
  socialRouteId: string;
  completedPoints: number[];
  completedCount: number;
}

export interface BonusRouteMilestone {
  points: number;
  amount: number;
  title?: string;
  description?: string;
  reached?: boolean;
  isReached?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BonusRouteProgress {
  routeId: string;
  scannedPoints: number[];
  milestonesReached: number[];
  milestones?: BonusRouteMilestone[];
}

// ----- New Food API Types -----

export interface FoodServiceApi {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  isOpen: boolean;
  workingHours?: any | null;
  preparationTimeMinutes?: number | null;
  minOrderAmount?: number | null;
  freeDeliveryFrom?: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryDescription?: string | null;
  sortOrder: number;
  bonusPercent?: number;
  deliveryFee?: number;
  deliveryTime?: string | null;
  pickupTime?: string | null;
  pickupAddress?: string | null;
  pickupDiscountPercent?: number;
  onlinePaymentEnabled?: boolean;
  cashOnDeliveryEnabled?: boolean;
  fiscalizationOwner?: 'platform' | 'seller';
}

export interface FoodCategoryApi {
  id: string;
  serviceId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
}

export interface FoodOptionApi {
  id: string;
  groupId: string;
  name: string;
  description?: string | null;
  priceDelta: number;
  isDefault: boolean;
  isActive?: boolean;
  isStopListed?: boolean;
  sortOrder: number;
}

export interface FoodOptionGroupApi {
  id: string;
  serviceId: string;
  itemId?: string | null;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  selectionType: 'single' | 'multiple' | string;
  required: boolean;
  minSelect: number;
  maxSelect?: number | null;
  isActive?: boolean;
  sortOrder: number;
  options: FoodOptionApi[];
}

export interface FoodItemApi {
  id: string;
  serviceId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  composition?: string | null;
  imageUrl?: string | null;
  images?: any | null;
  basePrice: number;
  price: number;
  oldPrice?: number | null;
  weight?: number | null;
  calories?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbs?: number | null;
  sortOrder: number;
  preparationTimeMinutes?: number | null;
  category?: FoodCategoryApi | null;
  optionGroups?: FoodOptionGroupApi[];
}

export interface FoodMenuResponseApi {
  service: FoodServiceApi;
  categories: FoodCategoryApi[];
  items: FoodItemApi[];
}

export interface ActiveRoutesResponse {
  activeBonusRouteId: string;
  activeSocialRouteId: string;
}

export interface HsbColor {
  h: number;
  s: number;
  b: number;
}

export interface GameSeasonPublic {
  seasonId: string;
  title: string;
  subtitle?: string;
  type: "color_match" | string;
  totalQuestions: number;
  maxScorePerQuestion?: number;
  maxTotalScore?: number;
}

export interface GameProgress {
  status: "not_started" | "in_progress" | "completed";
  completedCount: number;
  totalScore: number;
  bonusAmount: number;
  rewardClaimed: boolean;
  currentAttemptId?: string;
  currentAttemptStatus?: "in_progress" | "completed";
  currentAttemptCompletedCount?: number;
  currentAttemptScore?: number;
  firstScore?: number;
  firstBonusAmount?: number;
  bestScore?: number;
  lastScore?: number;
  attemptsCount?: number;
  canPlayAgain?: boolean;
}

export interface GameQuestionPublic {
  questionId: string;
  order: number;
  type: "color_match" | string;
  prompt: string;
  characterName?: string;
  targetPartName?: string;
  sourceName?: string;
  imageUrl?: string;
  maskedImageUrl?: string;
  maskUrl?: string;
  detailOverlayUrl?: string;
  shadeUrl?: string;
  originalImageUrl?: string;
  maxScore?: number;
}

export interface GameStateResponse {
  season: GameSeasonPublic;
  progress: GameProgress;
  currentQuestion: GameQuestionPublic | null;
  isCompleted?: boolean;
}

export interface GameAnswerResult {
  score: number;
  deltaE?: number;
  submittedHsb: HsbColor;
  targetHsb: HsbColor;
  submittedColorHex: string;
  targetColorHex: string;
}

export interface SubmitGameAnswerResponse {
  answerResult: GameAnswerResult;
  progress: GameProgress;
  nextQuestion: GameQuestionPublic | null;
}

export interface GameResultResponse {
  status: "not_started" | "in_progress" | "completed";
  completedCount: number;
  totalScore: number;
  bonusAmount: number;
  rewardClaimed: boolean;
  maxTotalScore?: number;
  completedAt?: string | null;
  currentAttemptId?: string;
  currentAttemptStatus?: "in_progress" | "completed";
  currentAttemptCompletedCount?: number;
  currentAttemptScore?: number;
  firstScore?: number;
  firstBonusAmount?: number;
  bestScore?: number;
  lastScore?: number;
  attemptsCount?: number;
  canPlayAgain?: boolean;
}

export interface GameLeaderboardItem {
  rank: number;
  userId?: string;
  displayName?: string;
  totalScore: number;
  bonusAmount: number;
  completedAt?: string | null;
}

export interface GameLeaderboardResponse {
  items: GameLeaderboardItem[];
  myRank?: GameLeaderboardItem | null;
}


