import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge, Pagination } from '../components/ui';
import MatchPanel from '../components/MatchPanel';
import { splitList, STATUS_LABELS } from '../utils/format';

describe('StatusBadge', () => {
  it('shows a human label for each application status', () => {
    render(<StatusBadge status="under_review" />);
    expect(screen.getByText('Under review')).toBeInTheDocument();
  });
});

describe('MatchPanel', () => {
  const match = {
    score: 72, skill_score: 75, semantic_score: 60, method: 'tf-idf',
    matched_skills: ['python'], missing_skills: ['aws'], unconfirmed_skills: [],
    note: null, disclaimer: 'Estimate only.',
  };

  it('lists matched and missing skills and the disclaimer', () => {
    render(<MatchPanel match={match} />);
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('aws')).toBeInTheDocument();
    expect(screen.getByText('Estimate only.')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination meta={{ page: 1, pages: 1, total: 3 }} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('format helpers', () => {
  it('normalises comma separated skills', () => {
    expect(splitList(' Python, SQL ,, react ')).toEqual(['python', 'sql', 'react']);
  });
  it('covers every status with a label', () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(7);
  });
});
