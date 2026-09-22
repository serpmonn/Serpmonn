<?php

/**
 * Roundcube branding helpers for Serpmonn:
 * - forgot-password link → profile
 * - login logo in a white circle
 * - localized product name + short browser tab title
 */
class serpmonn_forgot extends rcube_plugin
{
    public $task = '.*';

    function init()
    {
        $this->include_stylesheet('serpmonn_login.css');
        $this->add_texts('localization/', false);
        $this->add_hook('startup', [$this, 'startup']);
        $this->add_hook('render_page', [$this, 'render_page']);
    }

    function startup($args)
    {
        $rcmail = rcube::get_instance();
        $name = $this->gettext('productname');
        if ($name && $name !== 'productname') {
            $rcmail->config->set('product_name', $name);
        }

        return $args;
    }

    function render_page($args)
    {
        $template = $args['template'] ?? '';
        if ($template !== 'login' && $template !== 'logout') {
            return $args;
        }

        $rcmail = rcube::get_instance();
        $title = $this->gettext('pagetitle');
        if ($title && $title !== 'pagetitle') {
            $rcmail->output->set_pagetitle($title);
            $rcmail->config->set('product_name', '');
        }

        if (!empty($args['content']) && strpos($args['content'], 'serpmonn-forgot') === false) {
            $url = 'https://serpmonn.ru/frontend/profile/profile.html?onnmail=password';
            $label = $this->gettext('forgotpassword');
            $html = '<p class="serpmonn-forgot" style="margin:12px 0 0;text-align:center;">'
                . '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">'
                . htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
                . '</a></p>';

            // Once into login-footer (not via loginfooter — Roundcube doubles that hook on logout)
            $replaced = preg_replace(
                '#(<div id="login-footer"[^>]*>)(.*?)(</div>)#s',
                '$1$2' . $html . '$3',
                $args['content'],
                1,
                $count
            );
            if (!empty($count)) {
                $args['content'] = $replaced;
            } else {
                $args['content'] .= $html;
            }
        }

        return $args;
    }
}
