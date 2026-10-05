import { durianDiseaseCatalog, type DurianDisease } from "@/src/features/scanner/diseaseCatalog";

import type { DiagnosisDetail } from "./types";

type DiseaseCode = DurianDisease["code"];

const DETAILED_CONTENT: Record<DiseaseCode, Omit<DiagnosisDetail, "code" | "name" | "note" | "category">> = {
  Algal_Leaf_Spot: {
    biologicalTreatments: [
      "Tăng thông thoáng tán để giảm ẩm kéo dài trên bề mặt lá.",
      "Bổ sung chế phẩm sinh học chứa Trichoderma cho vùng đất gốc khi cần phục hồi hệ rễ.",
    ],
    causes: [
      "Độ ẩm cao kéo dài trên lá.",
      "Tán cây quá dày, ít thông gió.",
      "Lá non hoặc lá yếu dễ bị bám tảo và tổn thương thứ cấp.",
    ],
    decisionSupport: [
      "Nếu vết bệnh ít và khu trú, ưu tiên tỉa cành, vệ sinh vườn và theo dõi 7 ngày.",
      "Nếu lan nhanh trên nhiều lá non, nên kết hợp xử lý phòng bệnh sớm và báo kỹ sư kiểm tra.",
    ],
    exportRequirements: [
      "Chỉ thu hoạch theo lô khi tán lá đã ổn định và không còn dấu hiệu lan rộng.",
      "Không để lá bệnh bám vào khu vực đóng gói hoặc vận chuyển.",
    ],
    harvestInterval: "Theo dõi tối thiểu 7-14 ngày trước khi chốt lô thu hoạch gần khu vực nhiễm.",
    references: [
      "Cẩm nang chăm sóc DurianCare.",
      "Tài liệu kỹ thuật quản lý ẩm độ tán lá.",
    ],
    summary:
      "Đốm rong thường xuất hiện trong điều kiện ẩm cao, nơi tán lá dày và thông gió kém. Bệnh thường làm giảm sức lá và cần ưu tiên cắt nguồn ẩm.",
    symptoms: [
      "Đốm tròn màu xanh rêu đến nâu cam trên mặt lá.",
      "Mảng bệnh có thể lan rộng khi mưa kéo dài.",
      "Lá già hoặc lá nằm trong tán thường bị trước.",
    ],
    organicTreatments: [
      "Phun chế phẩm gốc đồng hoặc dung dịch sinh học được khuyến nghị theo hướng dẫn địa phương.",
      "Kết hợp cắt bỏ lá nhiễm nặng và gom tiêu hủy đúng quy trình.",
    ],
    chemicalTreatments: [
      "Chỉ dùng thuốc đặc trị khi vết bệnh lan nhanh và sau khi đã có khuyến nghị của kỹ sư.",
      "Luôn tuân thủ nhãn thuốc, nồng độ và thời gian cách ly trên bao bì.",
    ],
    prevention: [
      "Tỉa tán định kỳ để đón ánh sáng và gió.",
      "Tránh tưới phun lên lá vào cuối ngày.",
      "Theo dõi độ ẩm sau mưa và xử lý sớm vùng có nguy cơ.",
    ],
    sections: [],
  },
  Leaf_Blight: {
    biologicalTreatments: [
      "Tăng cường vi sinh vật có lợi cho vùng rễ để giúp cây phục hồi sau stress.",
      "Kết hợp dinh dưỡng cân bằng để giảm cháy mép lá mới.",
    ],
    causes: [
      "Sốc nhiệt hoặc ẩm độ dao động mạnh.",
      "Thoát nước kém làm rễ suy yếu.",
      "Bón phân hoặc phun thuốc quá liều gây cháy lá.",
    ],
    decisionSupport: [
      "Nếu cháy lá nhẹ ở rìa, kiểm tra lại tưới và dinh dưỡng trước khi dùng thuốc.",
      "Nếu mảng cháy lan nhanh sau phun, cần xem lại quy trình canh tác và dừng tác nhân gây sốc.",
    ],
    exportRequirements: [
      "Không để cây đang stress nặng bước vào lô chuẩn bị xuất vườn.",
      "Ghi chú rõ vùng đã xử lý để thương lái hoặc kỹ sư kiểm tra lại khi cần.",
    ],
    harvestInterval: "Chờ cây ổn định tối thiểu 10-14 ngày trước khi đánh giá lại sức khỏe tán lá.",
    references: [
      "Quy trình quản lý dinh dưỡng DurianCare.",
      "Hướng dẫn phòng cháy lá trong mùa nắng gắt.",
    ],
    summary:
      "Cháy lá thường liên quan đến stress dinh dưỡng, sốc nắng hoặc thoát nước kém. Hướng xử lý chính là ổn định môi trường và giảm nguyên nhân gây sốc.",
    symptoms: [
      "Mé p lá khô nâu, giòn và quăn lại.",
      "Vết cháy có thể xuất hiện sau giai đoạn nắng gắt hoặc sau phun thuốc.",
      "Lá mới ra yếu và dễ biến dạng.",
    ],
    organicTreatments: [
      "Bổ sung phân hữu cơ hoai mục và chế phẩm sinh học để phục hồi rễ.",
      "Phun dưỡng lá theo khuyến nghị nếu cây suy yếu kéo dài.",
    ],
    chemicalTreatments: [
      "Điều chỉnh phân bón và ngưng các tác nhân có nguy cơ gây cháy lá trước khi cân nhắc hóa học.",
      "Chỉ dùng hóa chất khi có khuyến nghị rõ ràng từ kỹ sư hoặc tài liệu kỹ thuật.",
    ],
    prevention: [
      "Tưới đều, tránh khô hạn kéo dài rồi tưới sốc.",
      "Không phun thuốc khi nhiệt độ quá cao.",
      "Theo dõi EC và liều lượng phân bón ở vùng rễ.",
    ],
    sections: [],
  },
  Phomopsis_Leaf_Spot: {
    biologicalTreatments: [
      "Thu gom lá bệnh và xử lý tàn dư để giảm nguồn lây.",
      "Duy trì hệ vi sinh có lợi trong đất để cây phục hồi tốt hơn.",
    ],
    causes: [
      "Mầm bệnh nấm tồn tại trong tàn dư lá và cành bị nhiễm.",
      "Môi trường ẩm kéo dài làm nấm lan nhanh.",
      "Vệ sinh vườn chưa tốt sau mưa hoặc sau tỉa cành.",
    ],
    decisionSupport: [
      "Nếu bệnh xuất hiện ở ít lá, ưu tiên vệ sinh và cách ly vùng bệnh.",
      "Nếu tái phát sau mỗi đợt mưa, cần rà lại toàn bộ hệ thống thoát nước và lịch phun phòng.",
    ],
    exportRequirements: [
      "Không để lá và cành bệnh lẫn vào khu đóng gói.",
      "Đánh dấu rõ khu vực đã xử lý để theo dõi tái nhiễm.",
    ],
    harvestInterval: "Theo dõi ít nhất 7 ngày sau vệ sinh vườn và xử lý phòng để đánh giá lại.",
    references: [
      "Sổ tay vệ sinh vườn DurianCare.",
      "Quy trình phòng nấm sau mưa.",
    ],
    summary:
      "Đốm Phomopsis thường đi kèm vệ sinh vườn kém và độ ẩm cao. Cần xử lý tàn dư bệnh và tăng cường phòng ngừa tái nhiễm.",
    symptoms: [
      "Đốm nâu xám trên lá, có thể lan rộng không đều.",
      "Mô bệnh có thể khô và rách khi già đi.",
      "Bệnh thường bùng lên sau mưa dài ngày.",
    ],
    organicTreatments: [
      "Thu gom lá bệnh, tiêu hủy đúng nơi quy định.",
      "Bổ sung chế phẩm sinh học và giữ vườn thông thoáng.",
    ],
    chemicalTreatments: [
      "Có thể cần thuốc phòng nấm được kỹ sư chỉ định nếu bệnh lan nhanh.",
      "Luôn tôn trọng khoảng cách cách ly và liều dùng ghi trên nhãn.",
    ],
    prevention: [
      "Cắt tỉa cành tạo thoáng sau mỗi mùa mưa.",
      "Vệ sinh dụng cụ trước khi chuyển khu.",
      "Không để lá rụng và cành bệnh lưu lại trong vườn.",
    ],
    sections: [],
  },
  Healthy_Leaf: {
    biologicalTreatments: ["Tiếp tục duy trì chế phẩm sinh học định kỳ để hỗ trợ hệ miễn dịch cây."],
    causes: ["Không phát hiện nguyên nhân bệnh. Cây đang sinh trưởng trong điều kiện tốt."],
    decisionSupport: [
      "Tiếp tục theo dõi định kỳ.",
      "Duy trì chế độ chăm sóc hiện tại; không cần can thiệp thuốc.",
    ],
    exportRequirements: ["Lá khỏe đủ điều kiện xuất vườn theo tiêu chuẩn thông thường."],
    harvestInterval: "Không có hạn chế đặc biệt. Thu hoạch theo lịch bình thường.",
    references: ["Cẩm nang chăm sóc DurianCare."],
    summary:
      "Lá được phân loại khỏe mạnh. Không phát hiện dấu hiệu bệnh, côn trùng hay tổn thương đáng lo ngại.",
    symptoms: ["Không có triệu chứng bệnh được phát hiện."],
    organicTreatments: ["Duy trì bón phân hữu cơ định kỳ."],
    chemicalTreatments: ["Không cần xử lý hóa chất."],
    prevention: [
      "Tiếp tục theo dõi sức khỏe lá hàng tuần.",
      "Duy trì thông thoáng tán và tưới đúng lịch.",
    ],
    sections: [],
  },
  Allocaridara_Attacked: {
    biologicalTreatments: [
      "Khuyến khích thiên địch và theo dõi quần thể côn trùng bằng bẫy dính.",
      "Giữ cân bằng dinh dưỡng để lá non không quá hấp dẫn côn trùng chích hút.",
    ],
    causes: [
      "Mật độ rầy nhảy tăng mạnh trên lá non.",
      "Thời tiết ẩm ấm làm côn trùng phát triển nhanh.",
      "Vườn có nhiều chồi non đồng loạt.",
    ],
    decisionSupport: [
      "Nếu mật độ thấp, theo dõi và quản lý cỏ dại, tỉa chồi non phù hợp.",
      "Nếu lá non bị chích hút nhiều, cần kỹ sư xác nhận ngưỡng xử lý ngay.",
    ],
    exportRequirements: [
      "Không để vết hại côn trùng lan tới lô chuẩn bị xuất hàng.",
      "Ghi chú vùng đã xử lý để kiểm tra lại trước xuất bán.",
    ],
    harvestInterval: "Theo dõi liên tục 5-7 ngày sau khi xử lý quần thể côn trùng.",
    references: [
      "Hướng dẫn quản lý côn trùng chích hút của DurianCare.",
      "Sổ tay kiểm tra mặt dưới lá non.",
    ],
    summary:
      "Rầy nhảy chích hút thường tấn công lá non, để lại vết hại rõ ở mặt dưới lá. Phát hiện sớm là then chốt để tránh lây lan trên đợt chồi mới.",
    symptoms: [
      "Lá non cong, chấm li ti hoặc bạc màu tại vị trí chích hút.",
      "Xuất hiện mật độ côn trùng ở mặt dưới lá non.",
      "Cây có dấu hiệu chậm phát triển chồi mới.",
    ],
    organicTreatments: [
      "Dùng bẫy dính và biện pháp sinh học để giảm mật độ côn trùng.",
      "Ưu tiên vệ sinh cỏ dại và chồi vô hiệu quanh vùng bệnh.",
    ],
    chemicalTreatments: [
      "Chỉ phun khi vượt ngưỡng xử lý và theo khuyến cáo chuyên môn.",
      "Luôn phun đúng thời điểm để giảm ảnh hưởng tới thiên địch.",
    ],
    prevention: [
      "Kiểm tra mặt dưới lá non định kỳ.",
      "Quản lý đợt chồi đồng loạt.",
      "Giữ vườn thông thoáng và hạn chế khu vực trú ẩn của côn trùng.",
    ],
    sections: [],
  },
};

for (const [code, detail] of Object.entries(DETAILED_CONTENT) as Array<[DiseaseCode, Omit<DiagnosisDetail, "code" | "name" | "note" | "category">]>) {
  detail.sections = [
    { heading: "Disease Summary", items: [detail.summary] },
    { heading: "Symptoms", items: detail.symptoms },
    { heading: "Causes", items: detail.causes },
    { heading: "Biological Treatments", items: detail.biologicalTreatments },
    { heading: "Organic Treatments", items: detail.organicTreatments },
    { heading: "Chemical Treatments", items: detail.chemicalTreatments },
    { heading: "Prevention", items: detail.prevention },
    { heading: "Decision Support", items: detail.decisionSupport },
    { heading: "Harvest Interval", items: [detail.harvestInterval] },
    { heading: "Export Requirements", items: detail.exportRequirements },
    { heading: "References", items: detail.references },
  ];
}

export const diagnosisDetails = durianDiseaseCatalog.map((disease) => ({
  ...disease,
  ...DETAILED_CONTENT[disease.code],
}));

export function getDiagnosisDetail(code?: string | null) {
  if (!code) return null;
  const normalized = code.trim();
  return diagnosisDetails.find((item) => item.code === normalized) ?? null;
}
