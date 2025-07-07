export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">서비스 이용약관</h1>
        
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제1조 (목적)</h2>
            <p className="text-gray-600">
              이 약관은 Pure Ocean 챗봇(이하 "서비스")이 제공하는 AI 코칭 서비스의 이용과 관련하여 서비스와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제2조 (정의)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><strong>"서비스"</strong>란 Pure Ocean 챗봇이 제공하는 AI 기반 교육 코칭 서비스를 의미합니다.</li>
              <li><strong>"이용자"</strong>란 이 약관에 따라 서비스가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
              <li><strong>"회원"</strong>이란 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며, 서비스가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제3조 (서비스의 제공)</h2>
            <p className="text-gray-600 mb-4">서비스는 다음과 같은 서비스를 제공합니다:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>AI 기반 소크라테스식 코칭 대화 서비스</li>
              <li>Pure Ocean Project 관련 학습 지원</li>
              <li>대화 기록 저장 및 조회 서비스</li>
              <li>기타 서비스가 정하는 교육 관련 서비스</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제4조 (회원가입)</h2>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>이용자는 서비스가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
              <li>서비스는 Google OAuth를 통한 간편 가입을 제공합니다.</li>
              <li>회원가입은 서비스의 승낙이 이용자에게 도달한 시점으로 합니다.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제5조 (서비스 이용)</h2>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 단, 기술적 문제나 서비스 개선을 위한 경우 일시적으로 중단될 수 있습니다.</li>
              <li>이용자는 서비스를 교육 목적으로만 사용해야 합니다.</li>
              <li>이용자는 서비스를 통해 얻은 정보를 서비스의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제6조 (이용자의 의무)</h2>
            <p className="text-gray-600 mb-4">이용자는 다음 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>타인의 정보 도용</li>
              <li>서비스에 게시된 정보의 무단 변경</li>
              <li>서비스가 정한 정보 이외의 정보 등의 송신 또는 게시</li>
              <li>서비스 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
              <li>서비스 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              <li>외설 또는 폭력적인 메시지, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제7조 (저작권의 귀속)</h2>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>서비스가 작성한 저작물에 대한 저작권 기타 지적재산권은 서비스에 귀속합니다.</li>
              <li>이용자가 서비스 내에서 작성한 대화 내용의 저작권은 해당 이용자에게 귀속됩니다.</li>
              <li>서비스는 서비스 개선 및 교육 연구 목적으로 이용자의 대화 내용을 익명화하여 활용할 수 있습니다.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제8조 (면책조항)</h2>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
              <li>서비스는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
              <li>서비스는 이용자가 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제9조 (분쟁 해결)</h2>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>서비스와 이용자 간에 발생한 분쟁은 상호 협의 하에 해결하는 것을 원칙으로 합니다.</li>
              <li>협의가 되지 않을 경우에는 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제10조 (약관의 개정)</h2>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>서비스는 필요하다고 인정되는 경우 이 약관을 개정할 수 있습니다.</li>
              <li>서비스가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
            </ol>
          </section>

          <section className="mb-8">
            <p className="text-gray-600 text-sm">
              <strong>부칙</strong><br />
              이 약관은 2025년 1월 7일부터 시행합니다.
            </p>
          </section>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>교육 목적 서비스 안내</strong><br />
              본 서비스는 완도고등학교 Pure Ocean Project의 교육 목적으로 제작되었습니다. 
              학생들의 창의적 사고와 문제 해결 능력 향상을 위한 AI 코칭 서비스를 제공합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}