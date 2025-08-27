export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보 처리방침</h1>
        
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. 개인정보의 수집 및 이용 목적</h2>
            <p className="text-gray-600 mb-4">
              Pure Ocean 챗봇은 다음의 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경될 시에는 사전 동의를 구할 예정입니다.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>서비스 제공: AI 코칭 챗봇 서비스 제공</li>
              <li>사용자 인증: Google OAuth를 통한 로그인 처리</li>
              <li>학습 데이터 개선: 서비스 품질 향상을 위한 대화 내용 분석</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. 수집하는 개인정보 항목</h2>
            <p className="text-gray-600 mb-4">Pure Ocean 챗봇은 다음의 개인정보 항목을 수집합니다:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>필수항목: 이메일 주소, 이름, Google 계정 프로필 사진</li>
              <li>선택항목: 학번, 학급</li>
              <li>자동수집항목: 서비스 이용 기록, 대화 내용, 접속 시간</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. 개인정보의 보유 및 이용 기간</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회원 탈퇴 시까지</li>
              <li>단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보존</li>
              <li>장기 미이용자(1년)의 경우 별도 통지 후 삭제</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="text-gray-600 mb-4">
              Pure Ocean 챗봇은 사용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>사용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>개인정보의 암호화: 비밀번호 등 중요 정보는 암호화하여 저장</li>
              <li>해킹 등에 대비한 기술적 대책: SSL 인증서를 통한 데이터 전송 보안</li>
              <li>개인정보 접근 제한: 최소한의 인원만 접근 가능</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. 이용자의 권리와 행사 방법</h2>
            <p className="text-gray-600 mb-4">이용자는 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="text-gray-600 mt-4">
              권리 행사는 이메일을 통하여 하실 수 있으며, 본인 확인 절차를 거친 후 처리됩니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. 개인정보 보호책임자</h2>
            <p className="text-gray-600 mb-4">
              개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>개인정보 보호책임자</strong><br />
                담당자: 공지훈<br />
                연락처: purusil55@gmail.com<br />
                소속: 완도고등학교 국어교사
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. 개인정보 처리방침의 변경</h2>
            <p className="text-gray-600">
              이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section>
            <p className="text-gray-600 text-sm">
              <strong>시행일:</strong> 2025년 1월 7일
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}