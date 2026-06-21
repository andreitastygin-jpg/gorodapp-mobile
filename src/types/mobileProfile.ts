export type MobileGender = string | null;

export interface MobileProfileUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  gender: MobileGender;
  isAdmin: boolean;
  isPremium: boolean;
}

export interface MobileProfileStats {
  ordersCount: number;
  friendsCount: number;
  bonusBalance: number;
}

export interface MobileProfileResponse {
  user: MobileProfileUser;
  stats: MobileProfileStats;
  referral: {
    referralCode: string | null;
  };
  sync: {
    status: string;
  };
}

export interface MobileProfileUpdatePayload {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  gender?: string | null;
}

export interface MobileAddress {
  id: string;
  address: string | null;
  street: string | null;
  deliveryAddress: string | null;
  house: string | null;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  intercom: string | null;
  comment: string | null;
  name: string | null;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MobileAddressCreatePayload = Partial<Omit<MobileAddress, 'id' | 'createdAt' | 'updatedAt'>>;
export type MobileAddressUpdatePayload = Partial<Omit<MobileAddress, 'id' | 'createdAt' | 'updatedAt'>>;

export interface MobileBonusHistoryItem {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  title: string;
  description: string | null;
  iconType: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface MobileBonusHistoryResponse {
  items: MobileBonusHistoryItem[];
  nextCursor: string | null;
}

export type MobileBonusHistoryType = 'all' | 'income' | 'expense';

export interface MobilePushRegisterPayload {
  expoPushToken: string;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  enabled?: boolean;
}

export interface MobilePushSettingsPayload {
  deviceId: string;
  enabled: boolean;
}

export interface MobilePushUnregisterPayload {
  deviceId: string;
}

export interface MobilePushResponse {
  success: boolean;
  enabled?: boolean;
}

export type MobileOrderMethod = 'pickup' | 'delivery';

export interface MobileOrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  brand?: string;
  size?: string;
}

export interface MobileOrder {
  id: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  total: number;
  itemsCount: number;
  previewTitle?: string;
  previewImage?: string;
  method?: MobileOrderMethod;
  paymentStatus?: string;
}

export interface MobileOrdersResponse {
  orders: MobileOrder[];
  nextCursor?: string | null;
}

export interface MobileOrderDetails extends MobileOrder {
  subtotal?: number;
  deliveryFee?: number;
  bonusesUsed?: number;
  earnedBonuses?: number;
  deliveryAddress?: string;
  pickupPoint?: string;
  comment?: string;
  paymentMethod?: string;
  items: MobileOrderItem[];
}

export interface MobileOrderDetailsResponse {
  order: MobileOrderDetails;
}

export interface MobileOrdersParams {
  limit?: number;
  cursor?: string;
  status?: 'active' | 'completed' | 'cancelled' | string;
}

