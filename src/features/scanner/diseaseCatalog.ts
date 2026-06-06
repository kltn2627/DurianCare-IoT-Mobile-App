export type DurianDisease = {
  code:
    | "Algal_Leaf_Spot"
    | "Leaf_Blight"
    | "Phomopsis_Leaf_Spot"
    | "Allocaridara_Attacked";
  name: string;
  note: string;
};

export const durianDiseaseCatalog: DurianDisease[] = [
  {
    code: "Algal_Leaf_Spot",
    name: "Đốm rong",
    note: "Tỉa cành thông thoáng và theo dõi vùng lá có đốm cam nâu.",
  },
  {
    code: "Leaf_Blight",
    name: "Cháy lá",
    note: "Cách ly lá tổn thương, giảm ẩm và kiểm tra khả năng thoát nước.",
  },
  {
    code: "Phomopsis_Leaf_Spot",
    name: "Đốm Phomopsis",
    note: "Thu gom lá bệnh và vệ sinh dụng cụ trước khi chuyển cây.",
  },
  {
    code: "Allocaridara_Attacked",
    name: "Vết hại do Rầy nhảy",
    note: "Kiểm tra mặt dưới lá non và theo dõi mật độ côn trùng.",
  },
];
