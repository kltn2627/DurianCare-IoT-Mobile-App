import type { ImageSourcePropType } from "react-native";

export type KnowledgeSection = {
  heading: string;
  paragraphs: string[];
  tips?: string[];
};

export type KnowledgeArticle = {
  author: string;
  category: string;
  cover: ImageSourcePropType;
  excerpt: string;
  id: string;
  publishedAt: string;
  readMinutes: number;
  sections: KnowledgeSection[];
  slug: string;
  title: string;
};

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    author: "Kỹ sư Nguyễn Hải Yến",
    category: "GlobalGAP",
    cover: require("../../../assets/images/community/leaf-blight.jpg"),
    excerpt:
      "Các điểm kiểm soát trọng yếu về truy xuất, an toàn lao động và đánh giá rủi ro trong vùng trồng hướng xuất khẩu.",
    id: "globalgap-readiness",
    publishedAt: "10/06/2026",
    readMinutes: 9,
    slug: "san-sang-globalgap-cho-vung-trong",
    title: "Chuẩn bị vùng trồng sầu riêng theo GlobalGAP",
    sections: [
      {
        heading: "Đánh giá rủi ro trước mùa vụ",
        paragraphs: [
          "Rà soát nguồn nước, lịch sử sử dụng đất, nguy cơ ô nhiễm từ khu vực lân cận và điều kiện an toàn của người lao động. Mỗi nguy cơ cần có biện pháp kiểm soát, người phụ trách và bằng chứng thực hiện.",
          "Sơ đồ vùng trồng phải thể hiện phân khu, kho vật tư, nguồn nước, nơi tập kết chất thải và khu vực sơ chế nếu có.",
        ],
        tips: [
          "Cập nhật đánh giá rủi ro khi có thay đổi nguồn nước hoặc mở rộng phân khu.",
          "Lưu ảnh, biên bản và dữ liệu cảm biến theo cùng mã vụ mùa.",
        ],
      },
      {
        heading: "Truy xuất và thu hồi sản phẩm",
        paragraphs: [
          "Mỗi lô thu hoạch cần liên kết được với phân khu, ngày thu hoạch, nhóm lao động và nhật ký vật tư. Nhà vườn nên diễn tập quy trình truy xuất ngược và thu hồi giả định ít nhất mỗi năm một lần.",
        ],
      },
      {
        heading: "Sức khỏe và an toàn lao động",
        paragraphs: [
          "Người lao động cần được hướng dẫn sử dụng bảo hộ, xử lý sự cố hóa chất và sơ cứu. Biển cảnh báo, khu rửa khẩn cấp và số liên hệ phải dễ tiếp cận tại vườn.",
        ],
      },
    ],
  },
  {
    author: "Ban kỹ thuật DurianCare",
    category: "VietGAP",
    cover: require("../../../assets/images/community/algal-leaf-spot.jpg"),
    excerpt:
      "Quy trình ghi chép, vệ sinh vườn và kiểm soát đầu vào giúp nhà vườn duy trì vùng trồng sầu riêng an toàn.",
    id: "vietgap-foundation",
    publishedAt: "08/06/2026",
    readMinutes: 7,
    slug: "nen-tang-vietgap-cho-vuon-sau-rieng",
    title: "Nền tảng VietGAP cho vườn sầu riêng",
    sections: [
      {
        heading: "1. Thiết lập hồ sơ vùng trồng",
        paragraphs: [
          "Mỗi phân khu cần có mã định danh, diện tích, giống cây, năm trồng và nguồn nước tưới. Nhật ký canh tác phải liên kết rõ với phân khu để truy xuất khi có cảnh báo.",
          "Vật tư đầu vào cần được lưu tên thương mại, hoạt chất, lô sản xuất, hạn dùng và người thực hiện.",
        ],
        tips: [
          "Đánh dấu ranh giới Khu A, Khu B bằng biển bền thời tiết.",
          "Không để thuốc bảo vệ thực vật chung với phân bón hoặc dụng cụ thu hoạch.",
        ],
      },
      {
        heading: "2. Quản lý vệ sinh và chất thải",
        paragraphs: [
          "Lá bệnh, cành khô và bao bì vật tư phải được thu gom theo nhóm. Dụng cụ cắt tỉa cần khử khuẩn trước khi chuyển sang cây khác.",
          "Nguồn nước thải sau pha rửa thiết bị không được xả trực tiếp vào mương tưới hoặc khu vực sinh hoạt.",
        ],
      },
      {
        heading: "3. Nhật ký điện tử",
        paragraphs: [
          "Ghi nhận thời gian, người thực hiện, phân khu, vật tư và kết quả sau mỗi công việc. Dữ liệu cảm biến và ảnh bệnh là bằng chứng hỗ trợ đánh giá hiệu quả xử lý.",
        ],
      },
    ],
  },
  {
    author: "Kỹ sư Trần An",
    category: "Bệnh lá",
    cover: require("../../../assets/images/community/leaf-blight.jpg"),
    excerpt:
      "Nhận biết sớm cháy lá, khoanh vùng cây có triệu chứng và giảm điều kiện ẩm kéo dài trong tán.",
    id: "leaf-blight",
    publishedAt: "07/06/2026",
    readMinutes: 6,
    slug: "xu-ly-som-benh-chay-la",
    title: "Xử lý sớm bệnh cháy lá tại vườn",
    sections: [
      {
        heading: "Dấu hiệu cần theo dõi",
        paragraphs: [
          "Tổn thương thường bắt đầu ở mép hoặc chóp lá, sau đó lan thành mảng nâu khô. Lá non có thể biến dạng khi áp lực bệnh cao.",
          "Cần chụp cả hai mặt lá và ghi nhận vị trí cây để phân biệt với cháy nắng hoặc thiếu dinh dưỡng.",
        ],
        tips: [
          "Ưu tiên kiểm tra cây ở nơi tán rậm và thoát nước chậm.",
          "Không kết luận chỉ từ một ảnh; đối chiếu điều kiện vườn và tốc độ lan.",
        ],
      },
      {
        heading: "Khoanh vùng và xử lý",
        paragraphs: [
          "Đánh dấu cây nghi nhiễm, thu gom bộ phận bệnh và tỉa cành tạo thông thoáng. Hạn chế tưới ướt tán vào cuối ngày.",
          "Kỹ sư phụ trách cần xác nhận phác đồ, liều lượng và thời gian cách ly trước khi áp dụng thuốc.",
        ],
      },
    ],
  },
  {
    author: "Nhóm IoT SmartFarm",
    category: "Dinh dưỡng",
    cover: require("../../../assets/images/community/algal-leaf-spot.jpg"),
    excerpt:
      "Cách đọc xu hướng N, P, K cùng độ ẩm đất để tránh bón phân theo một giá trị đo đơn lẻ.",
    id: "npk-reading",
    publishedAt: "05/06/2026",
    readMinutes: 8,
    slug: "doc-chi-so-npk-trong-vuon",
    title: "Đọc chỉ số NPK đúng cách trong vườn",
    sections: [
      {
        heading: "Không đọc NPK tách rời độ ẩm",
        paragraphs: [
          "Độ ẩm đất ảnh hưởng đến khả năng hòa tan và tín hiệu của đầu dò. Khi đất quá khô hoặc đọng nước, số đo NPK có thể lệch so với trạng thái dinh dưỡng thực tế.",
          "Nên so sánh chuỗi dữ liệu theo ngày và lấy mẫu đất kiểm chứng định kỳ thay vì quyết định từ một lần đo.",
        ],
      },
      {
        heading: "Vai trò ba nguyên tố chính",
        paragraphs: [
          "Nitrogen hỗ trợ sinh trưởng lá và chồi. Phosphorus liên quan đến bộ rễ và quá trình phân hóa. Potassium góp phần điều hòa nước, sức chống chịu và chất lượng trái.",
        ],
        tips: [
          "Theo dõi đồng thời pH, độ ẩm và giai đoạn sinh trưởng.",
          "Gắn mọi lần bón phân vào nhật ký phân khu để đánh giá xu hướng sau xử lý.",
        ],
      },
    ],
  },
  {
    author: "Ban kỹ thuật DurianCare",
    category: "Mùa mưa",
    cover: require("../../../assets/images/community/leaf-blight.jpg"),
    excerpt:
      "Danh sách kiểm tra thoát nước, thông tán và lịch quan sát lá sau các đợt mưa kéo dài.",
    id: "rainy-season",
    publishedAt: "02/06/2026",
    readMinutes: 5,
    slug: "kiem-tra-vuon-sau-mua-lon",
    title: "Kiểm tra vườn sau mưa lớn",
    sections: [
      {
        heading: "Trong 24 giờ đầu",
        paragraphs: [
          "Kiểm tra rãnh thoát nước, vùng trũng, gốc cây có dấu hiệu ngập và các cành gãy. Ghi nhận nhanh bằng ảnh theo từng phân khu.",
          "Không di chuyển dụng cụ từ vùng nghi bệnh sang vùng khỏe khi chưa vệ sinh.",
        ],
      },
      {
        heading: "Trong ba ngày tiếp theo",
        paragraphs: [
          "Theo dõi độ ẩm đất, lá non và mặt dưới tán. So sánh dữ liệu cảm biến với ngưỡng cảnh báo để ưu tiên khu vực cần kỹ sư kiểm tra.",
        ],
        tips: [
          "Tạo cảnh báo nếu độ ẩm đất duy trì cao bất thường.",
          "Chụp ảnh cùng góc và khoảng cách để theo dõi tốc độ phát triển tổn thương.",
        ],
      },
    ],
  },
];

export function findKnowledgeArticle(slug: string): KnowledgeArticle | undefined {
  return knowledgeArticles.find((article) => article.slug === slug);
}
