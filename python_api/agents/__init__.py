from . import logline_agent
from . import theme_agent
from . import character_agent
from . import synopsis_agent
from . import structure_agent
from . import beatsheet_agent
from . import scenelist_agent
from . import script_agent
from . import story_theme_agent
from . import story_character_agent
from . import story_synopsis_agent
from . import story_structure_agent
from . import story_beatsheet_agent
from . import story_scenelist_agent
from . import story_script_agent

AGENTS = {
    'logline': logline_agent,
    'theme': theme_agent,
    'character': character_agent,
    'synopsis': synopsis_agent,
    'structure': structure_agent,
    'beatsheet': beatsheet_agent,
    'scenelist': scenelist_agent,
    'script': script_agent,
    'story_theme': story_theme_agent,
    'story_character': story_character_agent,
    'story_synopsis': story_synopsis_agent,
    'story_structure': story_structure_agent,
    'story_beatsheet': story_beatsheet_agent,
    'story_scenelist': story_scenelist_agent,
    'story_script': story_script_agent,
}
