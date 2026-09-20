import { FontSizeOutlined, SmileOutlined } from '@ant-design/icons'
import { useChildMode } from '../context/ChildModeContext'

export default function ReadingPreferenceControls() {
  const { isChildMode, isLargeTextMode, toggleChildMode, toggleLargeTextMode } = useChildMode()
  return <div aria-label="阅读模式" className="reading-controls" role="group">
    <button aria-label={`${isChildMode ? '关闭' : '开启'}儿童模式`} aria-pressed={isChildMode} className={isChildMode ? 'is-active' : ''} onClick={toggleChildMode} title="儿童模式" type="button"><SmileOutlined /><span>儿童</span></button>
    <button aria-label={`${isLargeTextMode ? '关闭' : '开启'}大字模式`} aria-pressed={isLargeTextMode} className={isLargeTextMode ? 'is-active' : ''} onClick={toggleLargeTextMode} title="大字模式" type="button"><FontSizeOutlined /><span>大字</span></button>
  </div>
}
