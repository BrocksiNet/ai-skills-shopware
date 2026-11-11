# Vagrant

A project with a `Vagrantfile`. PHP, Composer and Node run in the VM; the
host only runs `vagrant`.

- **DEV-004** In a Vagrant project, run commands through `vagrant ssh -c`
  and `cd` to the guest path the `Vagrantfile` syncs the project to
  (`/vagrant` by default) first.

## Find the folder

Vagrant syncs the project folder to `/vagrant` unless the `Vagrantfile`
says otherwise with `config.vm.synced_folder ".", "<guest path>"`. Read the
`Vagrantfile` and `cd` to that guest path in every command; without it the
command runs in the SSH user's home and finds no `vendor/`.

## Commands

```bash
vagrant ssh -c "cd /vagrant && vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh -c "cd /vagrant && composer phpstan"
vagrant ssh -c "cd /vagrant && bin/console cache:clear"
vagrant ssh -c "cd /vagrant/src/Administration/Resources/app/administration && npm run lint"
```

Replace `/vagrant` with the synced folder of the `Vagrantfile`. Check the
VM with `vagrant status`; start it with `vagrant up`.

## Mistakes

| Wrong | Right |
| ----- | ----- |
| PHP tools on the host | `vagrant ssh -c "cd <guest path> && …"` |
| `vagrant ssh -c "vendor/bin/phpunit"` without `cd` | `cd <guest path> &&` first |
| `/vagrant` when the `Vagrantfile` syncs elsewhere | the `synced_folder` guest path |
