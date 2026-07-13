export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; phone: string | null; role: 'admin' | 'customer'; avatar_url: string | null; created_at: string };
        Insert: { id: string; full_name?: string; phone?: string | null; role?: 'admin' | 'customer'; avatar_url?: string | null };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      services: {
        Row: { id: string; name: string; description: string | null; price: number; duration: number; is_active: boolean; created_by: string | null; created_at: string; updated_at: string };
        Insert: { name: string; description?: string | null; price: number; duration?: number; is_active?: boolean; created_by?: string | null };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      orders: {
        Row: { id: string; order_code: string; customer_id: string; service_id: string; quantity: number; total_amount: number; status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled'; midtrans_token: string | null; midtrans_order_id: string | null; payment_method: string | null; paid_at: string | null; completed_at: string | null; created_at: string };
        Insert: { order_code: string; customer_id: string; service_id: string; quantity?: number; total_amount: number; status?: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled'; midtrans_token?: string | null; midtrans_order_id?: string | null; payment_method?: string | null };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      reviews: {
        Row: { id: string; order_id: string; customer_id: string; service_id: string; rating: number; comment: string | null; created_at: string };
        Insert: { order_id: string; customer_id: string; service_id: string; rating: number; comment?: string | null };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };
      chat_rooms: {
        Row: { id: string; order_id: string; customer_id: string; admin_id: string; created_at: string; last_message_at: string };
        Insert: { order_id: string; customer_id: string; admin_id: string; last_message_at?: string };
        Update: Partial<Database['public']['Tables']['chat_rooms']['Insert']>;
      };
      chat_messages: {
        Row: { id: string; room_id: string; sender_id: string; content: string; is_read: boolean; created_at: string };
        Insert: { room_id: string; sender_id: string; content: string; is_read?: boolean };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
    };
  };
};