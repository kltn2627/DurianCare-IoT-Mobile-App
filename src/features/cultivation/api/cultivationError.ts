export function cultivationError(error: unknown, fallback = "Không thể tải dữ liệu. Vui lòng thử lại."): string {
  const value = error as { status?: number; name?: string; code?: string; cause?: { code?: string }; message?: string } | null;
  const status = value?.status;
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn chưa có quyền truy cập hoặc thực hiện thao tác trên vườn/mùa vụ này.";
  if (status === 404) return "Không tìm thấy công việc, vật tư hoặc dữ liệu được yêu cầu. Hãy tải lại.";
  if (status === 409) return "Dữ liệu đã thay đổi hoặc mã đã được liên kết với vật tư khác. Hãy tải lại để kiểm tra.";
  if (status === 400) return "Thông tin chưa hợp lệ. Kiểm tra thời gian, vật tư, số lượng và đơn vị rồi thử lại.";
  if (status === 422) return "Không đọc được nhãn hoặc thông tin chưa hợp lệ. Hãy kiểm tra và thử lại.";
  if (status === 413) return "Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn rồi thử lại.";
  if (status && status >= 500) return "Dịch vụ đang gặp sự cố. Vui lòng thử lại sau.";
  if ([value?.code, value?.cause?.code].some(code => code === "ECONNABORTED" || code === "ETIMEDOUT")) return "Máy chủ phản hồi quá chậm. Vui lòng thử lại.";
  if (value?.name === "AuthApiError" || status) return fallback;
  return error instanceof Error ? error.message : fallback;
}
