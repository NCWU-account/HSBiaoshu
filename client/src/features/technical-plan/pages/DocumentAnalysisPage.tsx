import { useState } from 'react';
import { useToast } from '../../../shared/ui';
import { requestDocumentAnalysis } from '../services/analysisWorkflow';

interface DocumentAnalysisPageProps {
  fileName: string;
  fileContent: string;
  projectOverview: string;
  techRequirements: string;
  onFileImported: (fileName: string, fileContent: string) => void;
  onAnalysisComplete: (overview: string, requirements: string) => void;
  onNext: () => void;
}

function DocumentAnalysisPage({
  fileName,
  fileContent,
  projectOverview,
  techRequirements,
  onFileImported,
  onAnalysisComplete,
  onNext,
}: DocumentAnalysisPageProps) {
  const [overviewDraft, setOverviewDraft] = useState(projectOverview);
  const [requirementsDraft, setRequirementsDraft] = useState(techRequirements);
  const [busy, setBusy] = useState<'import' | 'analysis' | null>(null);
  const [statusText, setStatusText] = useState('');
  const { showToast } = useToast();

  const importDocument = async () => {
    try {
      setBusy('import');
      setStatusText('');
      const result = await window.yibiao?.file.importDocument();

      if (!result?.success || !result.file_content) {
        showToast(result?.message || '未导入文件', 'info');
        return;
      }

      onFileImported(result.file_name || '未命名文件', result.file_content);
      showToast(result.message, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '文件解析失败', 'error');
    } finally {
      setBusy(null);
    }
  };

  const analyzeDocument = async () => {
    if (!fileContent) {
      showToast('请先导入招标文件', 'info');
      return;
    }

    try {
      setBusy('analysis');
      setStatusText('正在解析项目概述...');
      const overview = await requestDocumentAnalysis(fileContent, 'overview');
      setOverviewDraft(overview);

      setStatusText('正在提取技术评分要求...');
      const requirements = await requestDocumentAnalysis(fileContent, 'requirements');
      setRequirementsDraft(requirements);
      onAnalysisComplete(overview, requirements);
      showToast('标书解析完成', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '标书解析失败', 'error');
    } finally {
      setStatusText('');
      setBusy(null);
    }
  };

  const saveDraft = () => {
    onAnalysisComplete(overviewDraft, requirementsDraft);
    showToast('解析结果已保存', 'success');
  };

  return (
    <div className="plan-step-body">
      <section className="analysis-import-card">
        <div>
          <span className="section-kicker">STEP 01</span>
          <strong>{fileName || '导入招标文件'}</strong>
          <p>{statusText || (fileContent ? `已提取 ${fileContent.length.toLocaleString()} 字` : '支持 PDF、DOCX、TXT、Markdown')}</p>
        </div>
        <div className="analysis-actions">
          <button type="button" className="secondary-action" onClick={importDocument} disabled={busy !== null}>
            {busy === 'import' ? '导入中...' : '选择文件'}
          </button>
          <button type="button" className="primary-action" onClick={analyzeDocument} disabled={!fileContent || busy !== null}>
            {busy === 'analysis' ? '解析中...' : '解析标书'}
          </button>
        </div>
      </section>

      <section className="analysis-result-grid">
        <article className="analysis-result-card">
          <div className="analysis-result-head">
            <strong>项目概述</strong>
            <span>可编辑</span>
          </div>
          <textarea
            value={overviewDraft}
            onChange={(event) => setOverviewDraft(event.target.value)}
            placeholder="解析后显示项目背景、建设内容、时间安排和关键要求。"
          />
        </article>

        <article className="analysis-result-card">
          <div className="analysis-result-head">
            <strong>技术评分要求</strong>
            <span>可编辑</span>
          </div>
          <textarea
            value={requirementsDraft}
            onChange={(event) => setRequirementsDraft(event.target.value)}
            placeholder="解析后显示技术评分项、分值、评分标准和原文位置。"
          />
        </article>
      </section>

      <div className="plan-step-actions">
        <button type="button" className="secondary-action" onClick={saveDraft}>保存结果</button>
        <button type="button" className="primary-action" onClick={onNext} disabled={!overviewDraft || !requirementsDraft}>进入目录编辑</button>
      </div>
    </div>
  );
}

export default DocumentAnalysisPage;
