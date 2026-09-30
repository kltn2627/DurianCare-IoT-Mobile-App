export type DiseaseCategory = "HEALTHY" | "PEST" | "DISEASE";

export type DurianDisease = {
  code:
    | "Algal_Leaf_Spot"
    | "Allocaridara_Attacked"
    | "Healthy_Leaf"
    | "Leaf_Blight"
    | "Phomopsis_Leaf_Spot";
  name: string;
  note: string;
  category: DiseaseCategory;
};

export const durianDiseaseCatalog: DurianDisease[] = [
  {
    code: "Algal_Leaf_Spot",
    name: "Đốm rong",
    note: "Tỉa cành thông thoáng và theo dõi vùng lá có đốm cam nâu.",
    category: "DISEASE",
  },
  {
    code: "Allocaridara_Attacked",
    name: "Vết hại do Rầy nhảy",
    note: "Kiểm tra mặt dưới lá non và theo dõi mật độ côn trùng.",
    category: "PEST",
  },
  {
    code: "Healthy_Leaf",
    name: "Lá khỏe mạnh",
    note: "Không phát hiện bệnh. Tiếp tục theo dõi định kỳ và duy trì chăm sóc tốt.",
    category: "HEALTHY",
  },
  {
    code: "Leaf_Blight",
    name: "Cháy lá",
    note: "Cách ly lá tổn thương, giảm ẩm và kiểm tra khả năng thoát nước.",
    category: "DISEASE",
  },
  {
    code: "Phomopsis_Leaf_Spot",
    name: "Đốm Phomopsis",
    note: "Thu gom lá bệnh và vệ sinh dụng cụ trước khi chuyển cây.",
    category: "DISEASE",
  },
];

export function getDiseaseAlertMessage(category: DiseaseCategory): string {
  if (category === "HEALTHY") return "Chưa phát hiện dấu hiệu bất thường trên lá.";
  if (category === "PEST") return "⚠️ Phát hiện dấu hiệu sâu/bọ gây hại trên lá. Vui lòng kiểm tra cây.";
  return "Phát hiện dấu hiệu bệnh trên lá.";
}
