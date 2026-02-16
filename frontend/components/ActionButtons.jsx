import { Icon } from './Icon';

const ActionButtons = ({ onApiAction, isLoading }) => {
  return (
    <div className="editor-actions">
      <button className="action-btn primary" onClick={() => onApiAction('review')} disabled={isLoading}><Icon name="review" />Review</button>
      <button className="action-btn" onClick={() => onApiAction('rewrite')} disabled={isLoading}><Icon name="rewrite" />Rewrite</button>
      <button className="action-btn" onClick={() => onApiAction('explain')} disabled={isLoading}><Icon name="explain" />Explain</button>
      <button className="action-btn" onClick={() => onApiAction('optimize')} disabled={isLoading}><Icon name="optimize" />Optimize</button>
    </div>
  );
};

export default ActionButtons;
