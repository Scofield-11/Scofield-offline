Báo cáo nâng cấp Scofield — 17/11/2026

**1. Tổng quan:** Đã triển khai hạng mục 0–3 trong mã nguồn hiện tại: loại secret không dùng, helper bốn trường; phản hồi Learn khi sai/chưa nhớ; card và hoạt ảnh tiếng Trung; kiểm tra toàn diện với kết quả, lịch sử và lưu Note. Đã dùng [ui-ux-pro-max](../.agents/skills/ui-ux-pro-max/SKILL.md), tra cứu hướng dẫn UX focus/keyboard/modal và React effect/cleanup. Giữ các token Matte Slate & Tonal Violet hiện hữu.

Phần cần quản trị viên tiếp tục xử lý là thu hồi khóa đã công khai và xác minh bảo mật Supabase thực tế. Kiểm thử IME trên điện thoại thật, chất lượng giọng đọc hệ điều hành và đồng bộ trên dự án Supabase thật chưa được thực hiện. Chưa triển khai lên hosting.

**2. File thay đổi:** Các file dưới đây là phần triển khai và kiểm chứng cho yêu cầu này.

| File tạo mới | Mục đích |
| --- | --- |
| `src/utils/vocabHelper.js` | Đọc alias và dữ liệu thật, xác định thiếu trường, so khớp bảo toàn dấu, tạo/chấm câu toàn diện, thống kê và snapshot. |
| `src/utils/hanziData.js` | URL data khóa phiên bản, kiểm tra cấu trúc, cache RAM/CacheStorage, gộp request, timeout và retry. |
| `src/utils/hanziRenderTarget.js` | SVG target qua điểm mở rộng chính thức của Hanzi Writer, không đăng ký các listener chấm bài viết tay không dùng. |
| `src/utils/testHistory.js` | Giữ trường lịch sử tùy chọn và ánh xạ lại ID khi nhập JSON. |
| `src/components/VocabularyAnswerDetail.jsx` | Chi tiết bốn trường, câu vừa hỏi, đáp án và phát âm theo trường. |
| `src/components/AccessibleModal.jsx` | Portal, focus trap/restore, Escape, inert nền, khóa cuộn, hỗ trợ fullscreen. |
| `src/components/ChineseVocabularyCard.jsx` | Card tĩnh cho `zh`, thao tác nghe/Note/sửa/xóa riêng. |
| `src/components/ChineseVocabularyModal.jsx` | Ghép modal, hoạt ảnh và chi tiết từ. |
| `src/components/HanziStrokeOrder.jsx` | Lazy import renderer chính thức, chọn ký tự, điều khiển hoạt ảnh, lỗi/retry/ghi công. |
| `src/components/ComprehensiveQuestion.jsx` | Ba input, nhãn, Enter/Tab và bảo vệ composition IME. |
| `src/components/ComprehensiveResult.jsx` | Đúng/sai từng trường và tỷ lệ từng kỹ năng. |
| `src/components/VocabularyEnhancements.css` | Style có phạm vi cho thành phần mới, responsive và reduced motion. |
| `tests/vocabHelper.test.js` | Alias, dữ liệu thiếu, quy tắc chấm, điều kiện học phần, phát âm. |
| `tests/hanziData.test.js` | Unicode, cấu trúc dữ liệu, cache, request trùng, retry. |
| `tests/localEngine.test.js` | API local, JSON merge, lịch sử, Note, SRS và cloud mock roundtrip. |
| `tests/browser/fixtures.js` | Dữ liệu kiểm thử riêng, chặn Supabase thật, lựa chọn học phần. |
| `tests/browser/experiences.spec.js` | Responsive, hoạt ảnh, IME, Learn, ba chế độ cũ, Flashcard/Match, cache/offline. |
| `tests/browser/smoke.spec.js` | Toàn diện → kết quả → tạo bộ câu sai → reload lịch sử → lưu Note. |
| `tests/browser/pwa.spec.js` | Bản production có service worker, reload offline và nét chữ đã/chưa cache. |
| `tests/browser/data/你.json`, `好.json`, `谢.json`, `05b66.svg` | Fixture dữ liệu thật từ nguồn khóa phiên bản, giữ nguyên nội dung. |
| `playwright.config.js` | Chạy kiểm thử Edge headless trên Vite dev. |
| `playwright.pwa.config.js` | Chạy kiểm thử PWA trên bản build tại cổng 4173. |
| `public/licenses/ARPHICPL.txt` | Bản giấy phép dữ liệu chữ Trung nguyên văn. |
| `public/licenses/hanzi-writer-MIT.txt` | Giấy phép thư viện Hanzi Writer. |
| `public/licenses/README.md` | Nguồn, phiên bản và ghi công cho dữ liệu/thư viện/fixtures. |
| `docs/scofield-upgrade-report.md` | Báo cáo này. |

| File sửa | Mục đích |
| --- | --- |
| `src/api/axiosConfig.js` | Xóa khai báo secret không được dùng; snapshot dữ liệu ví dụ trước fallback; lưu/đọc/import trường lịch sử mới; hỗ trợ reading/kanji alias; sửa nhận diện JSON một học phần có title. |
| `src/components/LearnMode.jsx` | Giữ snapshot câu sai và dùng chi tiết bốn trường; reset feedback khi bắt đầu; giảm chuyển động khi được yêu cầu. |
| `src/components/VocabularyList.jsx` | Nhánh card/modal riêng cho `language === 'zh'`. |
| `src/components/KanjiStrokeOrder.jsx` | Khóa KanjiVG, xử lý Unicode, bỏ kết quả cũ/abort, retry, reduced motion, điều khiển cảm ứng và ghi công. |
| `src/components/TestSetup.jsx` | Tùy chọn toàn diện có điều kiện, số từ hợp lệ/bị loại, giới hạn đề và trạng thái tải. |
| `src/components/TestMode.jsx` | Tạo/chấm/lưu đề toàn diện, ba trạng thái nhập, modal xác nhận, xem lịch sử và lưu từ gốc. |
| `src/components/TestResult.jsx` | Tái sử dụng kết quả toàn diện/thống kê, callback tạo bộ câu sai, reduced motion. |
| `src/components/ExamHistoryTable.jsx` | Nhãn nhận diện bài ba trường. |
| `src/components/SaveNoteModal.jsx` | Modal truy cập được, lưu object đầy đủ thay cho chuỗi phân cách, lọc Note cùng ngôn ngữ. |
| `src/utils/audio.js` | Tùy chọn giữ locale chính xác cho phát âm từng trường; mặc định các lệnh gọi cũ giữ nguyên. |
| `src/components/Flashcard.jsx` | Tách wrapper rỗng để hooks luôn chạy đúng thứ tự; sửa lỗi lint đã có. |
| `src/pages/AdminUsersPage.jsx` | Đặt return kiểm tra quyền sau hooks; sửa lỗi lint đã có, giữ logic quyền hiện hành. |
| `src/App.css` | Giới hạn/wrap thanh điều khiển Kanji và lớp chữ tĩnh cho reduced motion. |
| `package.json` | Khóa Hanzi Writer 3.5.0, Playwright 1.56.1; thêm lệnh test/unit/browser/PWA. |
| `package-lock.json` | Khóa dependency mới. |
| `vite.config.js` | Đưa giấy phép TXT vào precache PWA. |
| `.gitignore` | Bỏ qua ảnh/trace/kết quả chạy kiểm thử. |

**3. Kiến trúc:** `VocabContext` tiếp tục đọc API local trong `axiosConfig.js`. Storage giữ các bảng `sets`, `vocabularies`, `test_histories`. Học phần Kanji vẫn tạo câu từ `examples`; ID có dạng `parentId_ex_index`, kèm `parent_kanji_id` và `example_index`. `source_fields` chỉ xuất hiện ở kết quả đọc để phân biệt dữ liệu thiếu với fallback cũ, không được thêm vào bảng đồng bộ.

`VocabularyAnswerDetail` dùng chung ở Learn và modal tiếng Trung. Learn lưu snapshot ngay khi chấm sai, nên đổi vòng học không làm chi tiết nhảy sang từ khác. Thời gian micro-reward 360ms, cách chấm cũ và vòng hỏi lại được giữ; SRS được kiểm tra riêng qua API local.

`ja` dùng KanjiVG `r20260714`; `zh` dùng [Hanzi Writer 3.5.0](https://hanziwriter.org/docs.html) và [Hanzi Writer Data 2.0.1](https://github.com/chanind/hanzi-writer-data). JSON đã xác minh có `strokes` và `medians`. Data tiếng Trung không fallback sang nguồn tiếng Nhật. Card không tạo writer hoặc fetch nét; modal mới lazy import thư viện. Cache Trung tách biệt, tối đa 128 mục mỗi tầng RAM/CacheStorage, gộp request đang tải, timeout 12 giây, lỗi không cache. Effect bỏ qua kết quả muộn; mỗi lượt dựng có DOM mount riêng để cleanup cũ không xóa writer mới.

Hanzi Writer 3.5.0 không có public `destroy`. Adapter dùng `rendererOverride.createRenderTarget` đã kiểm tra trong type/source của package; không thay thuật toán vẽ. Cleanup hủy animation bằng `hideCharacter({ duration: 0 })`, xóa DOM sở hữu và không cài listener document dùng cho quiz viết tay. Test mở/đóng nhiều lần xác nhận không phát sinh `mouseup`/`touchend` listener từ writer. Đây không phải phép đo heap dài hạn.

Đổi tốc độ dựng lại writer với dữ liệu cache và trở về sẵn sàng. Chữ Trung chỉ phát khi người dùng bấm, giữ vị trí riêng cho ký tự lặp, dùng code point Unicode. Không có nút số thứ tự nét Trung vì nguồn đang dùng không cung cấp vị trí nhãn chính xác; số nét tổng vẫn hiển thị. KanjiVG tiếp tục có bật/tắt số nét từ SVG gốc.

Toàn diện chỉ xuất hiện khi ID trỏ tới đúng một bản ghi `sets.type === 'kanji'`. Chọn thư mục/gộp nhiều bộ không đủ điều kiện. Đề lọc đủ bốn trường thật trước khi tạo và kiểm tra lại lúc bắt đầu. Mỗi câu giữ `originalVocab`, `correctAnswer`/`userAnswer` theo ba trường và `fieldResults`. `score/total` vẫn đếm câu: chỉ 3/3 mới là một câu đúng. Ba tỷ lệ kỹ năng được tính độc lập. Các trường thêm vào lịch sử là tùy chọn: `exam_format`, `field_stats`, `question_details`; `wrong_details` vẫn có dạng tương thích màn hình cũ.

Matcher mới chỉ dùng cho toàn diện: NFC, không phân biệt hoa/thường, gộp khoảng trắng, giữ dấu Việt, thanh Pinyin, Kana nhỏ/âm kéo dài. Chấp nhận toàn chuỗi hoặc phương án phân cách bằng `;`, `|`, xuống dòng; Hán Việt/cách đọc còn hỗ trợ `/`, `、`. Không tự tách dấu phẩy trong nghĩa và không fuzzy match. Note/bộ câu sai lấy snapshot gốc, không tái dựng bằng chuỗi `questionText | correctAnswer`.

**4. Kiểm thử:** Đã chạy trên Windows với Node 24.14.0 và Microsoft Edge headless. Trong PowerShell dùng `npm.cmd` do execution policy của npm.ps1.

| Lệnh | Kết quả thực tế |
| --- | --- |
| `npm.cmd test` | 12/12 qua: hàm thuần, cache và tích hợp local storage/API/JSON/cloud mock/SRS. |
| `npm.cmd run test:browser` | 24/24 qua, khoảng 1,9 phút. |
| `npm.cmd run build` | Qua; tạo service worker và 20 mục precache. Main JS 751,26 kB (gzip 215,16 kB); Hanzi lazy chunk 34,71 kB (gzip 10,35 kB). Còn cảnh báo chunk trên 500 kB. |
| `npm.cmd run test:pwa -- --output=test-results-check/pwa` | 1/1 qua trên production build: reload offline, đọc Hanzi cache, fallback chữ chưa tải. |
| `npm.cmd run lint` | Exit 0; 65 cảnh báo trong mã hiện tại, không có lỗi. |
| `git diff --check` | Qua. |
| `npm.cmd audit --json --fetch-retries=0 --fetch-timeout=20000` | Exit 1: 14 cảnh báo dependency, gồm 8 high, 5 moderate, 1 low. Hanzi Writer và Playwright không có tên trong danh sách cảnh báo này. |

Kiểm thử browser bao gồm: hai theme ở 360/390/768/1280px, không tràn ngang, giới hạn modal, Escape/focus restore/scroll unlock, phát/tạm dừng/tiếp tục/replay/tốc độ, chữ lặp, ký tự ngoài BMP không có data, cache sau reload, offline/retry, 203 card tĩnh không fetch nét, nguồn Kanji Nhật riêng, Learn sai/chưa nhớ và lượt hỏi lại, IME composition/Enter, cảnh báo bỏ trống, 0/3–2/3–3/3, kết quả 0/2–1/2–2/2, tạo Note, tạo học phần câu sai, reload lịch sử và thêm Note từ lịch sử.

Ảnh thực tế đã được mở kiểm tra: modal Trung mobile Light và desktop Dark, bài toàn diện 360px và kết quả. Các ảnh của tám tổ hợp viewport/theme nằm trong `test-results/experiences-responsive-*`; ảnh không được commit. Test mô phỏng IME bằng sự kiện DOM và dùng CSS fullscreen để ổn định viewport. Không coi đó là kiểm thử bàn phím iOS/Android, fullscreen native hoặc VoiceOver/NVDA. Phát âm trong browser test được tắt; locale được kiểm tra bằng unit test, chưa đánh giá chất lượng giọng đọc thực tế.

Lần chạy PWA đầu đã qua assertion nhưng tiến trình quản lý server chưa kết thúc trong sandbox Windows; đã dừng phiên của tác vụ, mở preview riêng và chạy lại đạt exit 0 như bảng trên. Fixtures nét viết lấy từ nguồn thật đã khóa phiên bản; các request trong browser test được route về fixture để kết quả có thể lặp lại.

**5. Tương thích ngược:** Không migration phá hủy, không đổi khóa localStorage, không đổi tên trường `hiragana`. Ba chế độ `choice`/`typing`/`mixed` vẫn dùng chuỗi và bộ chấm cũ; cả ba đã nộp bài thành công trong browser test. Flashcard lật thẻ, Match khởi tạo, Learn hỏi lại, thao tác SRS và renderer Kanji Nhật đã qua kiểm tra được mô tả ở trên.

History cũ tiếp tục đi nhánh một đáp án và giữ shape API; history mới được giữ trong JSON/cloud payload. Test JSON merge xác nhận ánh xạ lại ID set, ID Kanji cha và ID ví dụ tổng hợp. Test cloud thay `fetch` bằng mock để xác nhận push/pull không mất trường mới, không kết nối dữ liệu Supabase thật. Browser test dùng user giả không có `sync_user_key` và chặn domain Supabase. Vì vậy xác thực, RLS, quyền admin và đồng bộ nhiều thiết bị thật chưa được xác nhận.

**6. Rủi ro còn lại:** Secret đã được gỡ khỏi frontend; tìm kiếm source và build trả về 0 lần cho identifier secret và prefix secret key, không in giá trị khóa. Mã auth hiện tại vẫn gửi/lấy trường password rồi so sánh phía client, giữ role và sync key trong localStorage. Đây là rủi ro cần xử lý riêng; thay đổi này chưa thể bảo đảm toàn bộ ứng dụng an toàn để phát hành production.

Dependency audit còn cảnh báo ở axios/follow-redirects, React Router, Vite/PostCSS/source-map-js/nanoid và nhánh Workbox/PWA/glob/minimatch/fast-uri/serialize-javascript. Một số khuyến nghị đổi phiên bản lớn; cần nâng và kiểm thử riêng thay vì áp dụng hàng loạt vào đợt tính năng này. Bundle chính vẫn lớn. Lịch sử toàn diện giữ snapshot tất cả câu nên tăng dung lượng localStorage; chưa stress test giới hạn quota bằng dữ liệu người dùng lớn. CacheStorage có thể bị trình duyệt thu hồi; chữ hiếm/data thiếu sẽ dùng chữ tĩnh. Chưa đo FPS trên điện thoại cấu hình thấp hoặc heap sau nhiều giờ sử dụng.

Giấy phép mã và data khác nhau: Hanzi Writer MIT, dữ liệu Trung Arphic, KanjiVG CC BY-SA 3.0. Đã giữ giấy phép và ghi công; thay đổi/phân phối dữ liệu tương lai cần tuân theo giấy phép tương ứng, không giả định mọi data đều là MIT. Xem [nguồn và giấy phép](../public/licenses/README.md).

**7. Việc quản trị viên cần làm:** Xóa source không vô hiệu hóa khóa từng bị lộ. Cần tạo khóa thay thế cho dịch vụ backend thực sự cần nó, cập nhật các consumer hợp lệ rồi thu hồi khóa cũ; không đặt secret vào `VITE_*`. Nếu dùng key legacy gắn JWT signing secret, xác định quy trình tương ứng và ảnh hưởng phiên đăng nhập trước khi xoay vòng. Xem [hướng dẫn API keys của Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

Sau đó triển khai bundle sạch, loại artifact/CDN cache cũ và kiểm tra cập nhật service worker. Rà soát quyền bảng `app_users`, `sync_data`, RLS và grants với tài khoản thử riêng: anonymous, user A, user B, admin; chứng minh người dùng không đọc/ghi backup hoặc password của nhau và không nâng quyền bằng sửa localStorage. Kiểm soát quyền phải dựa trên danh tính xác thực phía server. Kiểm tra log truy cập trong thời gian khóa bị lộ. Xử lý secret trong lịch sử Git/artifact sau khi đã thu hồi, phối hợp với người quản lý repo trước khi rewrite history.

Trước phát hành rộng, thử lại nhập Kana/Pinyin trên iOS Safari và Android Chrome, bàn phím ảo ở các ô cuối, Escape/Tab với trình đọc màn hình, giọng đọc Việt/Nhật/Trung, đăng nhập/đồng bộ trên staging có backup, và nâng dependency theo kết quả audit. Các thao tác quản trị Supabase và lịch sử Git không được tự thực hiện trong đợt nâng cấp này.
