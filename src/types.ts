export interface AppConfig {
  masterUrl: string;
  masterUsername: string;
  masterPassword: string;
  customUsername: string;
  customPassword: string;
  limitMoviesCount: number;
}

export interface ProxyLog {
  id: string;
  timestamp: string;
  ip: string;
  method: string;
  url: string;
  action?: string;
  userAgent: string;
  status: number;
}

export interface MovieStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating?: string;
  rating_5star?: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid?: string;
  direct_source?: string;
}

export interface MovieCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}
