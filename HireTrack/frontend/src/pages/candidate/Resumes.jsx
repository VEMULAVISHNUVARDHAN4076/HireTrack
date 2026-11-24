import { useEffect, useRef, useState } from 'react';
import { candidateApi, downloadProtected, errorMessage } from '../../services/api';
import { Alert, EmptyState, Spinner } from '../../components/ui';
import { formatDate } from '../../utils/format';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RESUMES = 5;

export default function Resumes() {
  const [resumes, setResumes] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = () => candidateApi.resumes().then(setResumes).catch((err) => setError(errorMessage(err)));
  useEffect(() => { load(); }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a PDF or DOCX file first.');
      return;
    }
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError('Only PDF and DOCX files are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('The file is larger than 5 MB.');
      return;
    }
    setUploading(true);
    try {
      await candidateApi.uploadResume(file);
      inputRef.current.value = '';
      setSuccess('Resume uploaded and text extracted.');
      load();
    } catch (err) {
      setError(errorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resume) => {
    if (!window.confirm(`Delete ${resume.filename}? This cannot be undone.`)) return;
    try {
      await candidateApi.deleteResume(resume.id);
      setSuccess('Resume deleted.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDownload = (resume) =>
    downloadProtected(`/resumes/${resume.id}/download`, resume.filename).catch((err) => setError(errorMessage(err)));

  const atLimit = resumes && resumes.length >= MAX_RESUMES;

  return (
    <div className="space-y-6">
      <h1 className="page-title">My resumes</h1>
      <p className="text-sm text-slate-600">
        Upload a PDF or DOCX up to 5 MB. Text is extracted so it can be matched against jobs. Scanned images are not supported.
        You can keep up to {MAX_RESUMES} resumes.
      </p>
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleUpload} className="card flex flex-wrap items-end gap-4" aria-labelledby="upload-heading">
        <div className="flex-1">
          <h2 id="upload-heading" className="mb-2 font-semibold">Upload a resume</h2>
          <input ref={inputRef} type="file" accept=".pdf,.docx" aria-label="Resume file"
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700" />
        </div>
        <button type="submit" className="btn-primary" disabled={uploading || atLimit}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        {atLimit && <p className="w-full text-sm text-amber-700">You have reached the limit. Delete a resume to upload another.</p>}
      </form>

      {!resumes && !error && <Spinner label="Loading resumes" />}
      {resumes?.length === 0 && <EmptyState title="No resumes yet" description="Upload your first resume to start applying." />}
      <ul className="space-y-3">
        {resumes?.map((r) => (
          <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{r.filename}</p>
              <p className="text-xs text-slate-500">Uploaded {formatDate(r.uploaded_at)} · {(r.size_bytes / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => handleDownload(r)}>Download</button>
              <button className="btn-danger" onClick={() => handleDelete(r)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
