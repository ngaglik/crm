import { Config } from "@/constant/config";
import { getAuthData } from "./authService";

const getHeaders = () => {
  const auth = getAuthData();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth?.token}`,
  };
};

// ==================== GROUP INDICATOR ====================

export const fetchGroupIndicators = async () => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch group indicators");
  }

  return response.json();
};

export const fetchGroupIndicatorById = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators/${id}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch group indicator");
  }

  return response.json();
};

export const createGroupIndicator = async (data: {
  name: string;
  is_active: boolean;
}) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create group indicator");
  }

  return response.json();
};

export const updateGroupIndicator = async (
  id: number,
  data: { name: string; is_active: boolean }
) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators/${id}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update group indicator");
  }

  return response.json();
};

export const deleteGroupIndicator = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators/${id}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete group indicator");
  }

  return response.json();
};

// ==================== INDICATOR ====================

export const fetchIndicators = async () => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch indicators");
  }

  return response.json();
};

export const fetchIndicatorById = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators/${id}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch indicator");
  }

  return response.json();
};

export const createIndicator = async (data: {
  name: string;
  group_id: number;
  is_active: boolean;
}) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create indicator");
  }

  return response.json();
};

export const updateIndicator = async (
  id: number,
  data: { name: string; group_id: number; is_active: boolean }
) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators/${id}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update indicator");
  }

  return response.json();
};

export const deleteIndicator = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators/${id}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete indicator");
  }

  return response.json();
};
