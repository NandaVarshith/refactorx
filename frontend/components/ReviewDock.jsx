
import React from 'react';
import { Icon } from './Icon';

const ReviewDock = ({ reviewData, onCardClick, onResolveIssue, fixingIssueId }) => {
  const renderReviewSummary = () => {
    if (!reviewData || !reviewData.issues || reviewData.issues.length === 0) {
      return <span>{reviewData ? 'No issues found. Great job!' : 'Run a review to see results.'}</span>;
    }

    const severityCounts = reviewData.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});

    return (
      <>
        {severityCounts.high > 0 && <span className="severity-summary"><Icon name="high" /><span className="severity-count">{severityCounts.high} High</span></span>}
        {severityCounts.medium > 0 && <span className="severity-summary"><Icon name="medium" /><span className="severity-count">{severityCounts.medium} Medium</span></span>}
        {severityCounts.suggestion > 0 && <span className="severity-summary"><Icon name="suggestion" /><span className="severity-count">{severityCounts.suggestion} Suggestion</span></span>}
      </>
    );
  };

  return (
    <div className="review-dock">
      <div className="review-header">
        <span>Review {reviewData && `(${reviewData.issues.length} Issues)`}</span>
        <span>{reviewData && `Quality: ${reviewData.score}/10`}</span>
      </div>
      <div className="review-summary">
        {renderReviewSummary()}
      </div>
      {reviewData?.summary && (
        <div className="review-structured-summary">{reviewData.summary}</div>
      )}
      <div className="review-content">
        {reviewData && reviewData.issues.map((issue) => (
          <div key={issue.id} className="review-card" onClick={() => onCardClick(issue.line)}>
            <div className="severity-row">
              <div className="severity">
              <Icon name={issue.severity} />
              {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} - Line {issue.line}
              </div>
              <button
                type="button"
                className="resolve-issue-btn"
                title="Fix this issue"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolveIssue(issue);
                }}
                disabled={Boolean(fixingIssueId)}
              >
                <Icon name="check" />
                {fixingIssueId === issue.id ? 'Fixing...' : 'Fix'}
              </button>
            </div>
            <div className="issue-message">{issue.message}</div>
            <div className="issue-fix-hint">Fix: {issue.fix}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewDock;
